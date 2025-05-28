import os
import psycopg2
from datetime import datetime

import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

from dotenv import load_dotenv

# Load environment variables from .env file in the same directory
# Load environment variables from .env file in the same directory
load_dotenv()

# Database connection details
DB_HOST = os.environ.get('POSTGRES_HOST', 'db')
DB_NAME = os.environ.get('POSTGRES_DB', 'litellm')
DB_USER = os.environ.get('POSTGRES_USER', 'postgres')

# Initialize Firebase Admin SDK
FIREBASE_ADMIN_SDK_SERVICE_ACCOUNT_KEY_PATH = os.environ.get('FIREBASE_ADMIN_SDK_SERVICE_ACCOUNT_KEY_PATH')

if not FIREBASE_ADMIN_SDK_SERVICE_ACCOUNT_KEY_PATH:
    print("FIREBASE_ADMIN_SDK_SERVICE_ACCOUNT_KEY_PATH environment variable not set.")
    exit(1) # Exit if the key path is not set

cred = credentials.Certificate(FIREBASE_ADMIN_SDK_SERVICE_ACCOUNT_KEY_PATH)
firebase_admin.initialize_app(cred)

db = firestore.client()
DB_PASSWORD = os.environ.get('POSTGRES_PASSWORD', 'mysecretpassword')

# Pricing per million tokens
PRICING = {
    'gpt-4o': {
        'input': 15.0,
        'output': 60.0
    },
    'deepseek-r1': {
        'input': 0.55,
        'output': 1.10
    }
}

# Ensure pricing keys are lowercase for case-insensitive matching
PRICING_LOWER = {k.lower(): v for k, v in PRICING.items()}

TOKEN_MULTIPLIER = 1_000_000

PROFIT_MARGIN = 0.30

def calculate_cost(model, input_tokens, output_tokens):
    """Calculates the cost for a single usage record with profit margin."""
    input_cost = (input_tokens / 1_000_000) * PRICING.get(model, {}).get('input', 0)
    output_cost = (output_tokens / 1_000_000) * PRICING.get(model, {}).get('output', 0)
    # Use case-insensitive model lookup for pricing
    model_pricing = PRICING_LOWER.get(model.lower(), {})
    total_cost = input_cost + output_cost
    return total_cost * (1 + PROFIT_MARGIN)

def addBillingRecordToFirestore(userId, model, inputTokens, outputTokens, cost, timestamp):
 """Adds a billing record to the 'billing' collection in Firestore."""
 try:
 billing_ref = db.collection('billing')
 doc_ref = billing_ref.add({
 'user_id': userId,
 'model': model,
 'input_tokens': inputTokens,
 'output_tokens': outputTokens,
 'cost': cost,
 'timestamp': timestamp
 })
 except Exception as e:
 print(f"Error adding billing record to Firestore for user {userId}: {e}")

def process_usage_data():
    """Connects to DB, queries usage, calculates cost, and prints/adds to Firestore."""
    conn = None
    cur = None
    try:
        # Connect to the PostgreSQL database
        conn = psycopg2.connect(host=DB_HOST, database=DB_NAME, user=DB_USER, password=DB_PASSWORD)
        cur = conn.cursor()

        # Query the completions table for relevant data
        # Note: The actual table and column names might vary based on LiteLLM version and config.
        # You might need to inspect your LiteLLM DB schema.
        # Assuming a table named 'completion_events' with columns like 'user_id', 'model', 'input_tokens', 'output_tokens', 'timestamp'
        cur.execute("""
            SELECT user_id, model, input_tokens, output_tokens, timestamp
            FROM completion_events -- Adjust table name if necessary based on LiteLLM DB schema
            ORDER BY timestamp;
        """)

        usage_records = cur.fetchall()

        if not usage_records:
            print("No usage data found.")
            return

        print("Processing usage data:")
        for record in usage_records:
            user_id, model, input_tokens, output_tokens, timestamp = record

            # Ensure input_tokens and output_tokens are not None
            input_tokens = input_tokens if input_tokens is not None else 0
            output_tokens = output_tokens if output_tokens is not None else 0

            # Calculate cost with profit margin
            cost = calculate_cost(model, input_tokens, output_tokens)

            # Print processed data
            print(f"Processing - User: {user_id}, Model: {model}, Input: {input_tokens}, Output: {output_tokens}, Cost: {cost:.6f}, Timestamp: {timestamp}")

 # Add billing record to Firestore


    except psycopg2.Error as e:
        print(f"Database error: {e}")
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        # Close the database connection
        if cur is not None:
            cur.close() # Ensure cursor is closed before connection
        if conn is not None:
            conn.close()
            print("Database connection closed.")

if __name__ == "__main__":
    process_usage_data()