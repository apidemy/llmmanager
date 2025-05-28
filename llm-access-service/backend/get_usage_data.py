import psycopg2
import os

def connect_to_db():
    """Connects to the PostgreSQL database and executes a simple query."""
    conn = None
    try:
        # Define database connection parameters
        db_params = {
            "database": "litellm",
            "user": "postgres",
            "password": "mysecretpassword",
            "host": "localhost",  # Assuming you're running this script locally and the db is accessible
            "port": "5432"
        }

        # Establish the connection
        print("Connecting to the database...")
        conn = psycopg2.connect(**db_params)
        print("Database connection established successfully.")

        # Execute a simple query
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        print("Simple query executed successfully.")

    except (Exception, psycopg2.Error) as error:
        print(f"Error connecting to or querying the database: {error}")

    finally:
        # Close the connection
        if conn:
            cursor.close()
            conn.close()
            print("Database connection closed.")

if __name__ == "__main__":
    connect_to_db()