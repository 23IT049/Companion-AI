# Installation Guide

## Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **MongoDB 7.0+** — [Download](https://www.mongodb.com/try/download/community)
- **OpenAI API Key**

---

## Step 1 — Start MongoDB

Install MongoDB and start it locally:

```powershell
mongod --dbpath="C:\data\db"
```

Default connection: `mongodb://localhost:27017`

---

## Step 2 — Backend Setup

```powershell
cd backend

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Configure `.env`

Copy the example and fill in your values:

```powershell
copy .env.example .env
```

Minimum required settings:

```env
OPENAI_API_KEY=your-openai-api-key-here
SECRET_KEY=any-random-string-at-least-32-chars
MONGODB_URL=mongodb://localhost:27017
CHROMA_HOST=localhost
CHROMA_PORT=8001
```

### Start ChromaDB

ChromaDB is installed via pip as part of `requirements.txt`. Run it as a local server:

```powershell
chroma run --path ./chroma_data --port 8001
```

### Start the Backend API

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## Step 3 — Frontend Setup

```powershell
cd frontend
npm install
npm start
```

---

## Access

| Service | URL |
|---|---|
| Chat UI | http://localhost:3000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| Health Check | http://localhost:8000/api/v1/health |

---

## Initial Data Setup

Device categories are auto-populated when you upload manuals via the UI.

To manually seed categories via the MongoDB shell:

```javascript
use device_troubleshoot

db.device_categories.insertMany([
  { name: "Refrigerator", brands: ["Samsung", "LG", "Whirlpool"], models: {}, created_at: new Date(), updated_at: new Date() },
  { name: "Washing Machine", brands: ["Samsung", "LG", "Bosch"], models: {}, created_at: new Date(), updated_at: new Date() },
  { name: "Air Conditioner", brands: ["Samsung", "LG", "Daikin"], models: {}, created_at: new Date(), updated_at: new Date() },
  { name: "TV", brands: ["Samsung", "LG", "Sony"], models: {}, created_at: new Date(), updated_at: new Date() },
  { name: "Dishwasher", brands: ["Bosch", "Whirlpool", "Samsung"], models: {}, created_at: new Date(), updated_at: new Date() }
])
```

---

## Troubleshooting

### Backend won't start
- Verify MongoDB is running: `mongosh --eval "db.stats()"`
- Check ChromaDB is running on port 8001
- Double-check `.env` values (especially `OPENAI_API_KEY`)

### Frontend can't connect
- Confirm backend is on port 8000
- Check `REACT_APP_API_URL` in `frontend/.env` (if set)

### Document processing fails
- Ensure ChromaDB server is running
- Verify your OpenAI API key has sufficient credits
- Check backend logs for specific errors
