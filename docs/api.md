# API Documentation

Base URL: `http://localhost:8000/api/v1`

All endpoints except `/auth/register` and `/auth/login` require authentication via JWT token in the `Authorization` header:

```
Authorization: Bearer <your-token>
```

## Authentication Endpoints

### Register User

**POST** `/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:** `201 Created`
```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "is_active": true,
  "created_at": "2026-02-09T22:19:15Z"
}
```

### Login

**POST** `/auth/login`

Login and receive JWT access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Get Current User

**GET** `/auth/me`

Get current authenticated user information.

**Response:** `200 OK`
```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "is_active": true,
  "created_at": "2026-02-09T22:19:15Z"
}
```

## Chat Endpoints

### Send Message

**POST** `/chat`

Send a troubleshooting query and receive AI-generated response.

**Request Body:**
```json
{
  "query": "My refrigerator is not cooling properly",
  "device_type": "Refrigerator",
  "brand": "Samsung",
  "model": "RF28R7351SR",
  "conversation_id": null
}
```

**Response:** `200 OK`
```json
{
  "answer": "Based on your Samsung refrigerator manual, here are troubleshooting steps:\n\n1. Check temperature settings...",
  "sources": [
    {
      "content": "If the refrigerator is not cooling, check the temperature settings...",
      "source_file": "Samsung_RF28R7351SR_Manual.pdf",
      "page_number": 45,
      "section_name": "Troubleshooting",
      "relevance_score": 0.92
    }
  ],
  "conversation_id": "conv-uuid",
  "message_id": "msg-uuid",
  "timestamp": "2026-02-09T22:19:15Z"
}
```

### Get Conversation History

**GET** `/conversation/{conversation_id}`

Retrieve full conversation history.

**Response:** `200 OK`
```json
{
  "conversation": {
    "conversation_id": "conv-uuid",
    "device_type": "Refrigerator",
    "brand": "Samsung",
    "model": "RF28R7351SR",
    "created_at": "2026-02-09T22:19:15Z",
    "updated_at": "2026-02-09T22:25:30Z",
    "message_count": 4
  },
  "messages": [
    {
      "message_id": "msg-uuid-1",
      "role": "user",
      "content": "My refrigerator is not cooling",
      "sources": [],
      "created_at": "2026-02-09T22:19:15Z"
    },
    {
      "message_id": "msg-uuid-2",
      "role": "assistant",
      "content": "Here are troubleshooting steps...",
      "sources": [...],
      "created_at": "2026-02-09T22:19:20Z"
    }
  ]
}
```

### List Conversations

**GET** `/conversations?limit=20&skip=0`

List user's conversations.

**Query Parameters:**
- `limit` (optional): Maximum conversations to return (default: 20)
- `skip` (optional): Number to skip for pagination (default: 0)

**Response:** `200 OK`
```json
[
  {
    "conversation_id": "conv-uuid",
    "device_type": "Refrigerator",
    "brand": "Samsung",
    "model": "RF28R7351SR",
    "created_at": "2026-02-09T22:19:15Z",
    "updated_at": "2026-02-09T22:25:30Z",
    "message_count": 4
  }
]
```

## Document Management Endpoints

### Upload Manual

**POST** `/upload-manual`

Upload a device manual for processing and indexing.

**Request:** `multipart/form-data`
- `file`: PDF/text file
- `device_type`: Device type (e.g., "Refrigerator")
- `brand`: Brand name (e.g., "Samsung")
- `model`: Model number (optional)

**Response:** `200 OK`
```json
{
  "document_id": "doc-uuid",
  "filename": "Samsung_Manual.pdf",
  "device_type": "Refrigerator",
  "brand": "Samsung",
  "model": "RF28R7351SR",
  "status": "pending",
  "message": "Document uploaded successfully and queued for processing"
}
```

### List Documents

**GET** `/documents?device_type=Refrigerator&brand=Samsung&status_filter=indexed&limit=50&skip=0`

List uploaded documents with optional filters.

**Query Parameters:**
- `device_type` (optional): Filter by device type
- `brand` (optional): Filter by brand
- `status_filter` (optional): Filter by status (pending, processing, indexed, failed)
- `limit` (optional): Maximum documents to return (default: 50)
- `skip` (optional): Number to skip for pagination (default: 0)

**Response:** `200 OK`
```json
[
  {
    "document_id": "doc-uuid",
    "filename": "Samsung_Manual.pdf",
    "device_type": "Refrigerator",
    "brand": "Samsung",
    "model": "RF28R7351SR",
    "status": "indexed",
    "chunks_count": 145,
    "uploaded_at": "2026-02-09T20:00:00Z",
    "processed_at": "2026-02-09T20:05:30Z"
  }
]
```

### Get Document Details

**GET** `/documents/{document_id}`

Get specific document details.

**Response:** `200 OK`
```json
{
  "document_id": "doc-uuid",
  "filename": "Samsung_Manual.pdf",
  "device_type": "Refrigerator",
  "brand": "Samsung",
  "model": "RF28R7351SR",
  "status": "indexed",
  "chunks_count": 145,
  "uploaded_at": "2026-02-09T20:00:00Z",
  "processed_at": "2026-02-09T20:05:30Z"
}
```

### Delete Document

**DELETE** `/documents/{document_id}`

Delete a document and its indexed chunks.

**Response:** `200 OK`
```json
{
  "message": "Document deleted successfully"
}
```

## Device Catalog Endpoints

### List All Devices

**GET** `/devices`

Get list of supported device types with brands and models.

**Response:** `200 OK`
```json
{
  "devices": [
    {
      "device_type": "Refrigerator",
      "brands": ["Samsung", "LG", "Whirlpool"],
      "models": {
        "Samsung": ["RF28R7351SR", "RF23J9011SR"],
        "LG": ["LFXS26973S", "LMXS30776S"]
      }
    }
  ],
  "total_count": 5
}
```

### Get Device Info

**GET** `/devices/{device_type}`

Get information about a specific device type.

**Response:** `200 OK`
```json
{
  "device_type": "Refrigerator",
  "brands": ["Samsung", "LG", "Whirlpool"],
  "models": {
    "Samsung": ["RF28R7351SR", "RF23J9011SR"],
    "LG": ["LFXS26973S", "LMXS30776S"]
  }
}
```

## Feedback Endpoints

### Submit Feedback

**POST** `/feedback`

Submit feedback on an assistant response.

**Request Body:**
```json
{
  "message_id": "msg-uuid",
  "rating": 5,
  "comment": "Very helpful troubleshooting steps!"
}
```

**Response:** `200 OK`
```json
{
  "feedback_id": "feedback-uuid",
  "message": "Feedback submitted successfully"
}
```

## Health Check Endpoints

### Health Check

**GET** `/health`

Comprehensive health check of all services.

**Response:** `200 OK`
```json
{
  "status": "healthy",
  "timestamp": "2026-02-09T22:19:15Z",
  "services": {
    "mongodb": {
      "status": "healthy",
      "latency_ms": 12.5
    },
    "vector_store": {
      "status": "healthy",
      "latency_ms": 8.3
    },
    "llm": {
      "status": "healthy"
    }
  },
  "version": "1.0.0"
}
```

### Liveness Probe

**GET** `/health/live`

Kubernetes liveness probe.

**Response:** `200 OK`
```json
{
  "status": "alive"
}
```

### Readiness Probe

**GET** `/health/ready`

Kubernetes readiness probe.

**Response:** `200 OK` or `503 Service Unavailable`
```json
{
  "status": "ready"
}
```

## Error Responses

All endpoints may return error responses in the following format:

### 400 Bad Request
```json
{
  "error": "Invalid request",
  "detail": "Query parameter is required",
  "timestamp": "2026-02-09T22:19:15Z"
}
```

### 401 Unauthorized
```json
{
  "detail": "Could not validate credentials"
}
```

### 403 Forbidden
```json
{
  "detail": "Not authorized to access this resource"
}
```

### 404 Not Found
```json
{
  "detail": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "detail": "Error details (development only)",
  "timestamp": "2026-02-09T22:19:15Z"
}
```

## Rate Limiting

- **Rate Limit**: 100 requests per minute per user
- **Burst Limit**: 20 requests

When rate limit is exceeded, you'll receive a `429 Too Many Requests` response.

## Interactive API Documentation

Visit `http://localhost:8000/docs` for interactive Swagger UI documentation where you can test all endpoints directly.
