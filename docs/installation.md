# Installation Guide

## Prerequisites

- **Docker & Docker Compose** (recommended) OR
- **Node.js 18+** and **Python 3.10+**
- **MongoDB 7.0+**
- **Redis 7+**
- **OpenAI API Key** or **Anthropic API Key**

## Quick Start with Docker (Recommended)

### 1. Clone and Setup

```bash
cd "d:\Companion AI"
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
# Copy example env file
cp backend/.env.example .env
```

Edit `.env` and add your API keys:

```env
OPENAI_API_KEY=your-openai-api-key-here
SECRET_KEY=your-secret-key-min-32-characters-long
```

### 3. Start All Services

```bash
docker-compose up -d
```

This will start:
- MongoDB on port 27017
- Redis on port 6379
- ChromaDB on port 8001
- Backend API on port 8000
- Frontend on port 3000

### 4. Access the Application

Open your browser and navigate to:
- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/v1/health

### 5. Create Your First User

You can register a new user through the API or frontend. For testing via API:

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "testpassword123"}'
```

## Manual Installation (Without Docker)

### Backend Setup

1. **Install Python Dependencies**

```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
```

2. **Install MongoDB**

Download and install MongoDB from https://www.mongodb.com/try/download/community

Start MongoDB:
```bash
mongod --dbpath=C:\data\db
```

3. **Install Redis**

Download Redis for Windows from https://github.com/microsoftarchive/redis/releases

Start Redis:
```bash
redis-server
```

4. **Install ChromaDB**

ChromaDB will be installed via pip, but you need to run it as a server:

```bash
chroma run --path ./chroma_data --port 8001
```

5. **Configure Backend**

```bash
cp .env.example .env
```

Edit `.env` with your settings.

6. **Run Backend**

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

1. **Install Node.js Dependencies**

```bash
cd frontend
npm install
```

2. **Configure Frontend**

Create `.env` file:

```env
REACT_APP_API_URL=http://localhost:8000
```

3. **Run Frontend**

```bash
npm start
```

The frontend will open at http://localhost:3000

## Initial Data Setup

### Seed Device Categories

You can seed initial device categories using the MongoDB shell or a script:

```javascript
// Connect to MongoDB
use device_troubleshoot

// Insert device categories
db.device_categories.insertMany([
  {
    name: "Refrigerator",
    brands: ["Samsung", "LG", "Whirlpool", "GE", "Frigidaire"],
    models: {},
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    name: "Washing Machine",
    brands: ["Samsung", "LG", "Whirlpool", "Bosch", "Maytag"],
    models: {},
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    name: "Air Conditioner",
    brands: ["Samsung", "LG", "Daikin", "Carrier", "Trane"],
    models: {},
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    name: "TV",
    brands: ["Samsung", "LG", "Sony", "TCL", "Vizio"],
    models: {},
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    name: "Dishwasher",
    brands: ["Bosch", "Whirlpool", "Samsung", "LG", "KitchenAid"],
    models: {},
    created_at: new Date(),
    updated_at: new Date()
  }
])
```

### Upload Sample Manuals

1. Navigate to http://localhost:3000
2. Register/login
3. Use the upload feature to add device manuals (PDF format)
4. The system will automatically process and index them

## Troubleshooting

### Backend won't start

- Check MongoDB is running: `mongo --eval "db.stats()"`
- Check Redis is running: `redis-cli ping`
- Verify environment variables in `.env`
- Check logs: `docker-compose logs backend`

### Frontend can't connect to backend

- Verify backend is running on port 8000
- Check CORS settings in backend `.env`
- Verify `REACT_APP_API_URL` in frontend `.env`

### Document processing fails

- Ensure ChromaDB is running
- Check file permissions in upload directory
- Verify OpenAI API key is valid
- Check backend logs for specific errors

### MongoDB connection issues

- Verify MongoDB URL in `.env`
- Check MongoDB is accepting connections
- Ensure database name is correct

## Production Deployment

### Using Docker Compose

1. Update `docker-compose.yml` for production:
   - Set `ENVIRONMENT=production`
   - Use strong `SECRET_KEY`
   - Configure proper volumes for data persistence
   - Set up reverse proxy (nginx)

2. Use production-ready databases:
   - MongoDB Atlas for managed MongoDB
   - Redis Cloud for managed Redis
   - Pinecone for vector database

3. Build and deploy:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Using Kubernetes

See `/docs/deployment.md` for Kubernetes deployment instructions.

## Next Steps

1. **Upload Device Manuals**: Add PDF manuals for devices you want to support
2. **Test Queries**: Try asking troubleshooting questions
3. **Customize Prompts**: Edit RAG prompt template in `backend/app/services/rag_service.py`
4. **Add More Devices**: Extend device categories in MongoDB
5. **Monitor Performance**: Check `/api/v1/health` endpoint

## Support

For issues and questions:
- Check the documentation in `/docs`
- Review API documentation at http://localhost:8000/docs
- Check application logs

## Security Notes

⚠️ **Important for Production**:
- Change default `SECRET_KEY`
- Use environment-specific `.env` files
- Enable HTTPS
- Implement rate limiting
- Regular security updates
- Backup databases regularly
