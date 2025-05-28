# llm-access-service/backend/api_backend.py
import os
import requests
from fastapi import FastAPI, HTTPException, Request, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, auth, firestore
from datetime import date, datetime
# from fastapi.responses import StreamingResponse # Uncomment for streaming


# Load environment variables from .env file in the backend directory
load_dotenv()

# --- Firebase Admin SDK Initialization ---
# Initialize Firebase Admin SDK once when the app starts
FIREBASE_ADMIN_SDK_SERVICE_ACCOUNT_KEY_PATH = os.environ.get('FIREBASE_ADMIN_SDK_SERVICE_ACCOUNT_KEY_PATH')
if not FIREBASE_ADMIN_SDK_SERVICE_ACCOUNT_KEY_PATH:
    print("FIREBASE_ADMIN_SDK_SERVICE_ACCOUNT_KEY_PATH environment variable not set.")
    # Exit or raise a critical error if the path is not set
    exit(1) # Exit the application if essential config is missing

try:
    # Use a default app name if not already initialized to avoid errors
    if not firebase_admin._apps:
        cred = credentials.Certificate(FIREBASE_ADMIN_SDK_SERVICE_ACCOUNT_KEY_PATH)
        firebase_admin.initialize_app(cred)
        print("Firebase Admin SDK initialized successfully.")
    else:
         print("Firebase Admin SDK already initialized.")

    db = firestore.client() # Get Firestore client

except Exception as e:
    print(f"Error initializing Firebase Admin SDK: {e}")
    # Exit or raise a critical error if initialization fails
    exit(1)


# --- FastAPI App Setup ---
app = FastAPI()

# Define request body model for /chat/completion
class ChatCompletionRequest(BaseModel):
    model: str
    messages: list


# --- Endpoint to Generate API Key ---
@app.post("/generate-api-key")
async def generate_api_key(authorization: str = Header(...)):
    """
    Generates a LiteLLM API key for the authenticated user and stores it in Firestore.
    Requires Firebase Auth ID token in Authorization header.
    """
    try:
        # 1. Verify Firebase Authentication token
        id_token = authorization.split("Bearer ")[1] if "Bearer " in authorization else None
        if not id_token:
             raise HTTPException(status_code=401, detail="Bearer token missing")

        decoded_token = auth.verify_id_token(id_token)
        user_id = decoded_token['uid']
        print(f"Authenticated user ID for key generation: {user_id}")

        # 2. Get LiteLLM configuration from environment variables
        litellm_url = os.environ.get('LITELLM_INTERNAL_API_URL', 'http://litellm:4000') # Default to internal Docker URL
        litellm_internal_key = os.environ.get('LITELLM_INTERNAL_API_KEY')

        if not litellm_internal_key:
            print("LITELLM_INTERNAL_API_KEY environment variable not set for key generation.")
            raise HTTPException(status_code=500, detail="Backend configuration error: LiteLLM key not set.")

        # 3. Call LiteLLM /key/generate API
        generate_key_url = f"{litellm_url}/key/generate"
        try:
            # Define models the key can access (based on your LiteLLM config)
            allowed_models = ["gpt-4o", "deepseek-r1"]
            # Define the initial budget. In a real app, this would be based on user's plan/balance.
            # For the free tier scenario, the first key might have a small budget or infinite (if limit is daily calls)
            # If using daily call limit implemented in backend, max_budget could be high or infinite here.
            # Let's set a nominal initial budget for demonstration, but daily call limit is enforced in /chat/completion
            initial_max_budget = 1000000 # Set a high budget if enforcing daily calls in backend

            litellm_response = requests.post(
                generate_key_url,
                headers={
                    "Authorization": f"Bearer {litellm_internal_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": allowed_models, # Specify models the key can access
                    "duration": "inf", # Key duration (e.g., "1h", "2d", "inf") - 'inf' means no expiry
                    "user_id": user_id, # Associate the key with the user ID for LiteLLM logs
                    "max_budget": initial_max_budget # Set a max budget (adjust based on your logic)
                }
            )
            litellm_response.raise_for_status() # Raise an exception for bad status codes
            litellm_data = litellm_response.json()
            generated_key = litellm_data.get("key")

            if not generated_key:
                 print(f"LiteLLM did not return an API key. Response: {litellm_data}")
                 raise HTTPException(status_code=500, detail="Failed to generate API key from LiteLLM.")

            print(f"Generated LiteLLM key for user {user_id}: {generated_key}")

        except requests.exceptions.RequestException as e:
            print(f"Error calling LiteLLM API for key generation: {e}")
            raise HTTPException(status_code=500, detail=f"Error communicating with LiteLLM: {e}")
        except Exception as e:
             print(f"An unexpected error occurred during LiteLLM key generation call: {e}")
             raise HTTPException(status_code=500, detail=f"An internal error occurred: {e}")


        # 4. Update Firestore with the New Key
        try:
            user_ref = db.collection('users').document(user_id)
            # Use set(merge=True) to update or create the document if it doesn't exist
            user_ref.set({'apiKey': generated_key}, merge=True)
            print(f"Updated Firestore with API key for user {user_id}")

        except Exception as e:
            print(f"Error updating Firestore with new API key: {e}")
            # Consider what to do if Firestore update fails after generating key in LiteLLM
            # You might want to log this as a critical error
            raise HTTPException(status_code=500, detail="Error saving API key to database.")

        # Return the generated key to the frontend (be cautious with exposing keys)
        # You might prefer to just return success and have the frontend refetch the profile
        return {"status": "success", "apiKey": generated_key}

    except HTTPException as e:
        raise e # Re-raise FastAPI HTTPExceptions
    except Exception as e:
        print(f"An unexpected error occurred in /generate-api-key: {e}")
        # Catch authentication errors from verify_id_token
        if "Firebase ID token has expired" in str(e) or "Firebase ID token is invalid" in str(e):
             raise HTTPException(status_code=401, detail="Invalid or expired authentication token.")
        else:
             raise HTTPException(status_code=500, detail=f"An internal server error occurred: {e}")


# --- Endpoint to Handle Chat Completions with Usage Control ---
@app.post("/chat/completion")
async def chat_completion(request: Request, body: ChatCompletionRequest):
    """
    Handles LLM chat requests, enforces free tier limits or checks paid balance,
    and proxies the request to the LiteLLM service.
    Requires Firebase Auth ID token in Authorization header.
    """
    user_id = None
    try:
        # 1. Verify Firebase Authentication token
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            raise HTTPException(status_code=401, detail="Authorization header missing")

        id_token = auth_header.split("Bearer ")[1] if "Bearer " in auth_header else None
        if not id_token:
             raise HTTPException(status_code=401, detail="Bearer token missing")

        decoded_token = auth.verify_id_token(id_token)
        user_id = decoded_token['uid']
        print(f"Authenticated user ID for chat completion: {user_id}")

        # 2. Retrieve User Data and Check Usage Limits
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()

        FREE_CALL_LIMIT = 5 # Define your daily free call limit
        request_allowed = False # Flag to indicate if the request is allowed

        if user_doc.exists:
            user_data = user_doc.to_dict()
            freeCallsToday = user_data.get('freeCallsToday', 0)
            lastFreeCallDate_ts = user_data.get('lastFreeCallDate') # This will be a Firestore Timestamp

            today = date.today()
            # Convert Firestore Timestamp to date object
            lastFreeCallDate = lastFreeCallDate_ts.toDate().date() if lastFreeCallDate_ts else None

            # Check if it's a new day and reset free calls
            if lastFreeCallDate is None or lastFreeCallDate < today:
                print(f"User {user_id} - New day, resetting free calls.")
                freeCallsToday = 0
                # Store the current date as a Firestore Timestamp (datetime object)
                user_ref.update({
                    'freeCallsToday': freeCallsToday,
                    'lastFreeCallDate': datetime.combine(today, datetime.min.time())
                })
                # Re-fetch user data after update
                user_doc = user_ref.get()
                user_data = user_doc.to_dict() # Get updated data

            # Check if user has remaining free calls
            if user_data.get('freeCallsToday', 0) < FREE_CALL_LIMIT:
                # User has remaining free calls, allow the request
                request_allowed = True
                print(f"User {user_id} - Using free call. Remaining: {FREE_CALL_LIMIT - user_data.get('freeCallsToday', 0) -1}") # -1 for the current call

            else:
                # Free limit reached, check paid balance
                print(f"User {user_id} - Free limit reached. Checking paid balance.")
                user_balance = user_data.get('balance', 0) # Assuming 'balance' field in user doc

                if user_balance > 0:
                    # User has a positive balance, allow the request for paid usage
                    request_allowed = True
                    print(f"User {user_id} - Has balance {user_balance}. Allowing paid call.")
                    # Note: Actual cost deduction happens later when processing LiteLLM logs

                else:
                    # User has no free calls left and insufficient balance
                    print(f"User {user_id} - Has insufficient balance.")
                    request_allowed = False
                    raise HTTPException(
                        status_code=403, # Forbidden
                        detail="You have run out of tokens. Please top up your account to continue."
                    )

        else:
            # User document doesn't exist (shouldn't happen if user is authenticated via Firebase)
             print(f"User document not found for authenticated user: {user_id}")
             raise HTTPException(status_code=500, detail="User data not found.")

        # 3. If request is allowed, Call LiteLLM and return response
        if request_allowed:
            print(f"User {user_id} request allowed. Calling LiteLLM.")

            litellm_url = os.environ.get('LITELLM_INTERNAL_API_URL', 'http://litellm:4000') # Default to internal Docker URL
            litellm_internal_key = os.environ.get('LITELLM_INTERNAL_API_KEY')

            if not litellm_internal_key:
                print("LITELLM_INTERNAL_API_KEY environment variable not set for chat completion.")
                raise HTTPException(status_code=500, detail="Backend configuration error: LiteLLM key not set for chat.")

            # Prepare the payload for LiteLLM - ensure it matches LiteLLM's expected input
            # LiteLLM's /v1/chat/completions endpoint expects OpenAI Chat Completions API format
            litellm_payload = {
                "model": body.model, # Use the model from the frontend request
                "messages": body.messages, # Use the messages from the frontend request
                # "stream": True # Uncomment for streaming
                # Add other LiteLLM parameters if needed (e.g., temperature, max_tokens)
            }

            # Add user identifier for LiteLLM logging (crucial for your billing script)
            # This adds a 'user' field to the LiteLLM log which your billing script can read.
            litellm_payload["user"] = user_id

            try:
                # Call LiteLLM's chat completions endpoint
                litellm_response = requests.post(
                    f"{litellm_url}/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {litellm_internal_key}",
                        "Content-Type": "application/json"
                    },
                    json=litellm_payload,
                    # stream=True # Uncomment for streaming
                )
                litellm_response.raise_for_status() # Raise an exception for bad status codes

                # Update free calls count in Firestore AFTER successful LiteLLM call if it was a free call
                if user_data.get('freeCallsToday', 0) < FREE_CALL_LIMIT:
                     current_free_calls = user_data.get('freeCallsToday', 0)
                     user_ref.update({
                         'freeCallsToday': current_free_calls + 1,
                         'lastFreeCallDate': datetime.combine(today, datetime.min.time()) # Update timestamp on each free call
                     })
                     print(f"User {user_id} - Incremented free call count after successful LiteLLM call.")


                # For non-streaming: Return the JSON response from LiteLLM directly
                return JSONResponse(content=litellm_response.json())

                # For streaming:
                # from fastapi.responses import StreamingResponse
                # return StreamingResponse(litellm_response.iter_lines(), media_type="text/event-stream")


            except requests.exceptions.RequestException as e:
                print(f"Error calling LiteLLM /v1/chat/completions: {e}")
                raise HTTPException(status_code=500, detail=f"Error communicating with the language model: {e}")
            except Exception as e:
                print(f"An unexpected error occurred during LiteLLM call processing: {e}")
                raise HTTPException(status_code=500, detail=f"An internal server error occurred: {e}")

        # If request_allowed was False, an HTTPException should have been raised already.
        # This part should ideally not be reached if the logic is correct.
        print(f"User {user_id} - Request was not allowed, but no HTTPException was raised.")
        raise HTTPException(status_code=500, detail="Internal logic error.")


    except HTTPException as e:
        raise e # Re-raise FastAPI HTTPExceptions
    except Exception as e:
        print(f"An unexpected error occurred in /chat/completion (outside LiteLLM call): {e}")
        # Catch authentication errors from verify_id_token
        if "Firebase ID token has expired" in str(e) or "Firebase ID token is invalid" in str(e):
             raise HTTPException(status_code=401, detail="Invalid or expired authentication token.")
        else:
             raise HTTPException(status_code=500, detail=f"An internal server error occurred: {e}")


# --- Basic Run Configuration (for development) ---
# To run this file directly: uvicorn api_backend:app --reload --host 0.0.0.0 --port 8000
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
