# Use a Python base image
FROM python:3.9-slim

WORKDIR /app

# Copy requirements.txt and install dependencies
# Assuming requirements.txt exists. If not, you'll need to create one
# or modify this step to install packages directly.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY . .

# Expose the port your FastAPI app runs on (default is 8000)
EXPOSE 8000

# Command to run the backend application using uvicorn
# Replace api_backend:app with the actual module and FastAPI app instance name
CMD ["uvicorn", "api_backend:app", "--host", "0.0.0.0", "--port", "8000"]
