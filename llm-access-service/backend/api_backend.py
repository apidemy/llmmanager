from fastapi import FastAPI, Request, HTTPException, Body
from fastapi.responses import JSONResponse
from fastapi import Header
import uvicorn
import os
from dotenv import load_dotenv
import requests

import firebase_admin
from firebase_admin import credentials
from firebase_admin import auth
from firebase_admin import firestore
from typing import List, Dict, Any

load_dotenv() # Load environment variables from .env file

service_account_key_path = os.environ.get('FIREBASE_ADMIN_SDK_SERVICE_ACCOUNT_KEY_PATH')
if not service_account_key_path or not os.path.exists(service_account_key_path):
     raise RuntimeError("Firebase service account key path not configured or invalid.")

# Initialize Firebase Admin SDK
cred = credentials.Certificate(service_account_key_path)
firebase_admin.initialize_app(cred)

db = firestore.client()

app = FastAPI()


@app.post('/generate-api-key')
async def generate_api_key(authorization: str = Header(...)):
    try:
        # Verify Firebase Authentication token
        id_token = authorization.split("Bearer ")[1]
        decoded_token = auth.verify_id_token(id_token)
        user_id = decoded_token['uid']
        print(f"Authenticated user ID: {user_id}")

        # Call the LiteLLM /key/generate API
        litellm_url = os.environ.get('LITELLM_URL', "http://litellm:4000") # Default to internal docker name
        litellm_internal_key = os.environ.get('LITELLM_INTERNAL_API_KEY')
        if not litellm_internal_key:
            raise HTTPException(status_code=500, detail="LITELLM_INTERNAL_API_KEY environment variable not set.")

        litellm_response = requests.post(
            f"{litellm_url}/key/generate",
            headers={
                "Authorization": f"Bearer {litellm_internal_key}",
                "Content-Type": "application/json"
            },
            json={
                "user_id": user_id,
                "models": ["gpt-4o", "deepseek-r1"], # Specify models the key can access
                "duration": "inf", # Key duration (e.g., "1h", "2d", "inf")
                "max_budget": 1.0 # Set an initial budget (should be determined by user's balance/plan in a real app)
            }
        )
        litellm_response.raise_for_status() # Raise an exception for bad status codes
        litellm_data = litellm_response.json()
        generated_key = litellm_data.get("key")
        print(f"Generated LiteLLM key: {generated_key}")

        if not generated_key:
             raise Exception("LiteLLM did not return an API key")

        # Update Firestore with the new key
        user_ref = db.collection('users').document(user_id)
        user_ref.update({'apiKey': generated_key})
        print(f"Updated user {user_id} with new API key in Firestore.")

        return {"status": "success", "apiKey": generated_key}

    except HTTPException as e:
        print(f"HTTP Exception: {e.detail}")
        raise e
    except requests.exceptions.RequestException as e:
        print(f"Error calling LiteLLM API: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating API key from LiteLLM: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")


@app.post('/chat/completion')
async def chat_completion(
    authorization: str = Header(...),
    body: Dict[str, Any] = Body(...) # Accept the request body as a dictionary
):
    """
    Handles chat completion requests, applying free tier limits or deducting from user balance.
    """
    try:
        # Placeholder: Verify Firebase Authentication token and get user ID
        # Placeholder: Check user's free tier usage or purchased balance
        # Placeholder: Deduct cost from balance or enforce free limit
        # Placeholder: Call LiteLLM's /v1/chat/completions endpoint using the user's API key
        # Placeholder: Return the LiteLLM response to the frontend
        pass # Replace with actual implementation

    except Exception as e:
        # Basic error handling for the new endpoint
        raise HTTPException(status_code=500, detail=f"Error in chat completion: {e}")

if __name__ == '__main__':
    # For development, run with uvicorn: uvicorn api_backend:app --reload
    uvicorn.run(app, host='0.0.0.0', port=8000)