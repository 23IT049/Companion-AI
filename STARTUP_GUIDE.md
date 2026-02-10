# How to Start the Backend

This guide explains how to start the FastAPI backend server after removing Redis and Celery.

## Prerequisites

Before starting the backend, ensure you have the following running:

1. **MongoDB**: The application needs a MongoDB instance.
   - Default URL: `mongodb://localhost:27017`
   - You can run it locally or via Docker: `docker run -d -p 27017:27017 mongo:7.0`

2. **ChromaDB**: The vector database for document embeddings.
   - Default URL: `http://localhost:8001`
   - You can run it via Docker or pip.
   - Via Docker: `docker run -d -p 8001:8000 chromadb/chroma:latest`

## Step 1: Environment Setup

1. Navigate to the backend directory:
   ```powershell
   cd backend
   ```

2. Create a virtual environment (recommended):
   ```powershell
   python -m venv venv
   .\venv\Scripts\activate
   ```

3. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```

## Step 2: Configuration

1. Create the `.env` file from the example:
   ```powershell
   copy .env.example .env
   ```

2. Open `.env` and configure your settings:
   - Sets your **OPENAI_API_KEY** (Required for RAG)
   - Verify `MONGODB_URL` matches your MongoDB instance
   - Verify `CHROMA_HOST` and `CHROMA_PORT` match your ChromaDB instance
     - If running ChromaDB locally via pip/docker on localhost, set:
       ```
       CHROMA_HOST=localhost
       CHROMA_PORT=8001
       ```

## Step 3: Run the Server

Start the backend server using `uvicorn`:

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- **--reload**: Enables auto-reload on code changes (useful for development)
- **--host 0.0.0.0**: Makes the server accessible from other devices
- **--port 8000**: Runs on port 8000

## Verification

Once running, you can access:
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/v1/health

## Troubleshooting

- **MongoDB Connection Error**: Ensure MongoDB is running and `MONGODB_URL` is correct.
- **ChromaDB Connection Error**: Ensure ChromaDB is running. If using `chromadb` python client in local mode (not client/server), you might need to adjust `CHROMA_HOST` settings or use local persistence path config.
  - *Note*: The current configuration expects a ChromaDB server. If you want to use local file-based ChromaDB without a server, you'll need to modify `app/services/rag_service.py` to use `chromadb.PersistentClient()` instead of `HttpClient`.

## Running the Frontend (Optional)

To run the full stack, restart the frontend in a new terminal:

```powershell
cd frontend
npm start
```
