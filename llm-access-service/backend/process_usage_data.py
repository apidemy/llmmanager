# llm-access-service/backend/process_usage_data.py
import os
import psycopg2
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
import pytz # Import pytz for timezone handling if needed

# Load environment variables from .env file in the backend directory
load_dotenv()

# --- Firebase Admin SDK Initialization ---
# Initialize Firebase Admin SDK once
FIREBASE_ADMIN_SDK_SERVICE_ACCOUNT_KEY_PATH = os.environ.get('FIREBASE_ADMIN_SDK_SERVICE_ACCOUNT_KEY_PATH')
if not FIREBASE_ADMIN_SDK_SERVICE_ACCOUNT_KEY_PATH:
    print("FIREBASE_ADMIN_SDK_SERVICE_ACCOUNT_KEY_PATH environment variable not set.")
    exit(1) # Exit if essential config is missing

try:
    if not firebase_admin._apps:
        cred = credentials.Certificate(FIREBASE_ADMIN_SDK_SERVICE_ACCOUNT_KEY_PATH)
        firebase_admin.initialize_app(cred)
        print("Firebase Admin SDK initialized successfully for billing script.")
    else:
        print("Firebase Admin SDK already initialized for billing script.")

    db = firestore.client() # Get Firestore client

except Exception as e:
    print(f"Error initializing Firebase Admin SDK for billing script: {e}")
    exit(1)


# --- Database Connection Parameters ---
# Use environment variables or hardcoded defaults
DB_USER = os.environ.get('POSTGRES_USER', 'postgres')
DB_PASSWORD = os.environ.get('POSTGRES_PASSWORD', 'mysecretpassword')
DB_NAME = os.environ.get('POSTGRES_DB', 'litellm')
DB_HOST = os.environ.get('POSTGRES_HOST', 'db') # 'db' if running in the same Docker network
DB_PORT = os.environ.get('POSTGRES_PORT', '5432')

# --- Model Pricing (per million tokens) ---
# These prices should reflect the cost from the LLM provider
# Adjust these based on the actual costs of GPT-4o and DeepSeek-R1
pricing_per_million = {
    "gpt-4o": {"input": 15.0, "output": 60.0},
    "deepseek-r1": {"input": 0.55, "output": 1.10}
}

PROFIT_MARGIN = 0.30 # 30% profit margin


# --- Function to Add Billing Record to Firestore ---
def add_billing_record_to_firestore(user_id, model, input_tokens, output_tokens, cost, timestamp):
    """Adds a billing record to the 'billing' collection in Firestore."""
    try:
        # Ensure timestamp is a Firestore Timestamp object or compatible
        # If timestamp from DB is a Python datetime, it should be fine.
        # If it's a string or other format, you might need to convert it.

        doc_ref = db.collection('billing').add({
            'user_id': user_id,
            'model': model,
            'input_tokens': input_tokens,
            'output_tokens': output_tokens,
            'cost': cost,
            'timestamp': timestamp, # Use the timestamp from the LiteLLM log
            'processed_at': firestore.SERVER_TIMESTAMP # Add a timestamp for when processed by this script
        })
        print(f"Added billing record for user {user_id} with ID: {doc_ref[1].id}")
    except Exception as e:
        print(f"Error adding billing record to Firestore for user {user_id}: {e}")
        # Log this error, but maybe continue processing other records
        # Depending on severity, you might want to stop or retry


# --- Main Processing Logic ---
def process_litellm_logs():
    conn = None
    cur = None
    try:
        # Connect to the PostgreSQL database
        conn = psycopg2.connect(
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT
        )
        cur = conn.cursor()
        print("Connected to PostgreSQL database.")

        # --- Query Usage Data from LiteLLM Logs ---
        # **IMPORTANT:** The table name and column names below might vary
        # based on your LiteLLM version and how its logging is configured.
        # In LiteLLM v3+, the table might be `litellm_logs`.
        # You need to verify the schema of your LiteLLM database.
        # Ensure you select columns for user ID, model, input tokens, output tokens, and timestamp.
        # Also, you need a mechanism to track which records have already been processed.
        # The query below assumes a `processed` boolean column exists and is false for new records.
        # You will need to add an UPDATE statement after processing to set `processed = true`.

        # Example Query (adjust column names as needed)
        query = """
            SELECT
                id,             -- Add ID to uniquely identify the record
                user_id,
                model,
                prompt_tokens,  -- Or input_tokens
                completion_tokens, -- Or output_tokens
                timestamp       -- The timestamp of the completion
            FROM litellm_logs
            WHERE processed = false -- Assuming a 'processed' flag exists
            ORDER BY timestamp;
        """
        cur.execute(query)
        usage_records = cur.fetchall()
        print(f"Found {len(usage_records)} unprocessed usage records.")

        processed_record_ids = [] # To store IDs of successfully processed records

        for record in usage_records:
            # Unpack the record - adjust indices based on your query SELECT order
            try:
                record_id = record[0]
                user_id = record[1]
                model = record[2]
                input_tokens = record[3] if record[3] is not None else 0
                output_tokens = record[4] if record[4] is not None else 0
                timestamp = record[5] # This should be a Python datetime object from psycopg2

                # Ensure user_id is not None or empty
                if not user_id:
                    print(f"Skipping record {record_id}: Missing user_id.")
                    continue # Skip to the next record

                # 1. Calculate Cost
                input_cost = (input_tokens / 1_000_000) * pricing_per_million.get(model, {}).get("input", 0)
                output_cost = (output_tokens / 1_000_000) * pricing_per_million.get(model, {}).get("output", 0)
                raw_cost = input_cost + output_cost

                # Add profit margin
                total_cost_with_margin = raw_cost * (1 + PROFIT_MARGIN)

                print(f"Record {record_id} for user {user_id} ({model}): Input: {input_tokens}, Output: {output_tokens}, Raw Cost: ${raw_cost:.6f}, Total Cost (with margin): ${total_cost_with_margin:.6f}")


                # 2. Add Billing Record to Firestore
                # Pass the original timestamp from the log
                add_billing_record_to_firestore(
                    user_id,
                    model,
                    input_tokens,
                    output_tokens,
                    total_cost_with_margin,
                    timestamp # Use the datetime object directly
                )

                # 3. Add record_id to the list for marking as processed
                processed_record_ids.append(record_id)

            except Exception as e:
                print(f"Error processing record {record[0] if len(record) > 0 else 'N/A'}: {e}")
                # Continue processing other records if one fails


        # --- Mark Records as Processed in PostgreSQL ---
        if processed_record_ids:
            # Create a tuple of IDs for the SQL IN clause
            ids_tuple = tuple(processed_record_ids)

            # SQL UPDATE statement to mark processed records
            update_query = """
                UPDATE litellm_logs
                SET processed = true
                WHERE id IN %s;
            """
            cur.execute(update_query, (ids_tuple,))
            conn.commit() # Commit the transaction
            print(f"Marked {len(processed_record_ids)} records as processed in PostgreSQL.")
        else:
            print("No records were successfully processed to mark in PostgreSQL.")


    except psycopg2.Error as e:
        print(f"Database error: {e}")
        if conn:
            conn.rollback() # Rollback in case of database error
        setError(f"Database connection or query error: {e}")
    except Exception as e:
        print(f"An unexpected error occurred during log processing: {e}")
        setError(f"An unexpected error occurred: {e}")
    finally:
        # Close the database connection
        if cur:
            cur.close()
        if conn:
            conn.close()
        print("Database connection closed.")

# --- Execute the processing script ---
if __name__ == "__main__":
    print("Starting LiteLLM usage log processing script...")
    process_litellm_logs()
    print("Log processing script finished.")
