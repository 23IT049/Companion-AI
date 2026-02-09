# System Architecture

## Overview

The AI Device Troubleshooting Chatbot uses a microservices architecture with RAG (Retrieval Augmented Generation) for intelligent document-based responses.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│                    (React.js + Tailwind CSS)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │   Chat   │  │  Device  │  │  Source  │  │  Upload  │      │
│  │Interface │  │ Selector │  │Citations │  │  Modal   │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTPS/WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API GATEWAY                              │
│                      (FastAPI + Uvicorn)                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Authentication │ Rate Limiting │ CORS │ Request Validation│ │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Endpoints:                                                     │
│  • POST /api/v1/chat          • POST /api/v1/upload-manual    │
│  • GET  /api/v1/devices       • POST /api/v1/feedback         │
│  • GET  /api/v1/health        • GET  /api/v1/conversation     │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                ▼             ▼             ▼
    ┌───────────────┐ ┌──────────────┐ ┌─────────────┐
    │   Chat        │ │   Document   │ │   Device    │
    │   Service     │ │   Service    │ │   Service   │
    └───────┬───────┘ └──────┬───────┘ └─────────────┘
            │                │
            ▼                ▼
    ┌───────────────────────────────────┐
    │      RAG PROCESSING LAYER         │
    │  ┌─────────────────────────────┐  │
    │  │  1. Query Understanding     │  │
    │  │  2. Vector Retrieval        │  │
    │  │  3. Context Ranking         │  │
    │  │  4. Response Generation     │  │
    │  │  5. Source Attribution      │  │
    │  └─────────────────────────────┘  │
    └───────────────┬───────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
┌──────────────┐ ┌─────────┐ ┌──────────────┐
│Vector Database│ │  LLM    │ │  PostgreSQL  │
│  (ChromaDB/   │ │(GPT-4/  │ │ (Metadata &  │
│   Pinecone)   │ │ Claude) │ │Conversations)│
└──────────────┘ └─────────┘ └──────────────┘
        │
        ▼
┌──────────────────────────────┐
│   DOCUMENT STORAGE           │
│   (S3 / Local FileSystem)    │
│   • Raw PDFs                 │
│   • Processed Chunks         │
│   • Extracted Images         │
└──────────────────────────────┘
```

## Component Details

### 1. User Interface Layer (React)

**Purpose**: Provide intuitive chat interface for users

**Key Components**:
- `ChatInterface`: Main conversation container
- `MessageBubble`: Individual messages with formatting
- `SourceCitation`: Expandable source references
- `DeviceSelector`: Filter by device type/brand/model
- `UploadModal`: Manual upload interface
- `TypingIndicator`: Real-time feedback

**State Management**: React Context API for global state

**Communication**: REST API + WebSocket for streaming responses

### 2. API Gateway (FastAPI)

**Purpose**: Handle HTTP requests, authentication, and routing

**Middleware Stack**:
```python
Request → CORS → Authentication → Rate Limiting → Validation → Route Handler
```

**Key Features**:
- JWT-based authentication
- Rate limiting: 100 req/min per user
- Request/response validation with Pydantic
- Comprehensive error handling
- Structured logging
- Health checks

**Endpoints**:
```
POST   /api/v1/chat              # Submit query
POST   /api/v1/upload-manual     # Upload device manual
GET    /api/v1/devices           # List supported devices
GET    /api/v1/conversation/:id  # Get conversation history
POST   /api/v1/feedback          # Submit feedback
GET    /api/v1/health            # Health check
```

### 3. Document Processing Pipeline

**Purpose**: Ingest, process, and index device manuals

**Pipeline Stages**:

```
1. INGESTION
   ├── PDF Upload
   ├── Text Extraction (PyPDF2, pdfplumber)
   ├── OCR for scanned docs (Tesseract)
   └── Metadata extraction

2. PREPROCESSING
   ├── Text cleaning
   ├── Header/footer removal
   ├── Encoding normalization
   └── Quality validation

3. CHUNKING
   ├── Semantic splitting (1000 chars, 200 overlap)
   ├── Preserve context boundaries
   └── Maintain metadata linkage

4. EMBEDDING
   ├── Generate vectors (sentence-transformers)
   ├── Batch processing
   └── Dimension: 384

5. INDEXING
   ├── Store in vector DB
   ├── Create metadata filters
   └── Build search indices
```

**Technologies**:
- PyPDF2, pdfplumber for PDF extraction
- LangChain TextSplitter for chunking
- sentence-transformers for embeddings
- Celery for async processing

### 4. Vector Database

**Purpose**: Store and retrieve document embeddings

**Schema Design**:

```python
Collection: device_manuals
├── id: str (unique chunk ID)
├── embedding: vector[384]
├── text: str (chunk content)
└── metadata:
    ├── device_type: str
    ├── brand: str
    ├── model: str
    ├── source_file: str
    ├── page_number: int
    ├── section_name: str
    ├── document_type: str
    ├── created_at: datetime
    └── relevance_score: float
```

**Indexing Strategy**:
- Primary index: device_type
- Secondary indices: brand, model
- HNSW algorithm for fast similarity search
- Metadata filtering for precision

**Options**:
- **ChromaDB**: Local development, embedded mode
- **Pinecone**: Production, managed service, auto-scaling

### 5. RAG Retrieval System

**Purpose**: Find relevant context for user queries

**Retrieval Flow**:

```
User Query
    ↓
Query Preprocessing
    ├── Spell correction
    ├── Entity extraction (device, brand, model)
    └── Query expansion
    ↓
Embedding Generation
    ↓
Vector Search (top-k=10)
    ├── Cosine similarity
    └── Metadata filtering
    ↓
Re-ranking
    ├── Semantic relevance
    ├── Metadata match score
    ├── Recency
    └── User feedback
    ↓
Top-5 Chunks
    ↓
Context Assembly
```

**Retrieval Strategy**:
- Hybrid search: Vector + keyword matching
- Multi-stage ranking
- Relevance threshold: 0.7
- Fallback to broader search if needed

### 6. LLM Integration Layer

**Purpose**: Generate natural language responses

**Prompt Template**:
```
System: You are an expert device repair technician...

Context from manuals:
{retrieved_chunks}

User Question: {user_query}

Instructions:
1. Diagnose the problem
2. Provide step-by-step troubleshooting
3. Include safety warnings
4. Cite sources
5. Recommend professional help when needed
```

**Features**:
- Temperature: 0.3 (consistent, factual)
- Max tokens: 1000
- Stop sequences for citations
- Streaming responses
- Hallucination detection

**LLM Options**:
- OpenAI GPT-4 (primary)
- Anthropic Claude 3 (alternative)
- Local models (Llama 2) for privacy-sensitive deployments

### 7. PostgreSQL Database

**Purpose**: Store structured data

**Tables**:

```sql
-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    hashed_password VARCHAR(255),
    created_at TIMESTAMP,
    is_active BOOLEAN
);

-- Conversations
CREATE TABLE conversations (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    device_type VARCHAR(100),
    brand VARCHAR(100),
    model VARCHAR(100),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Messages
CREATE TABLE messages (
    id UUID PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id),
    role VARCHAR(20), -- 'user' or 'assistant'
    content TEXT,
    sources JSONB,
    created_at TIMESTAMP
);

-- Feedback
CREATE TABLE feedback (
    id UUID PRIMARY KEY,
    message_id UUID REFERENCES messages(id),
    rating INTEGER, -- 1 (thumbs down) or 5 (thumbs up)
    comment TEXT,
    created_at TIMESTAMP
);

-- Documents
CREATE TABLE documents (
    id UUID PRIMARY KEY,
    filename VARCHAR(255),
    device_type VARCHAR(100),
    brand VARCHAR(100),
    model VARCHAR(100),
    file_path VARCHAR(500),
    status VARCHAR(50), -- 'processing', 'indexed', 'failed'
    uploaded_at TIMESTAMP,
    processed_at TIMESTAMP
);
```

## Data Flow

### Chat Request Flow

```
1. User submits query via React UI
2. Frontend sends POST to /api/v1/chat
3. API Gateway validates JWT token
4. Rate limiter checks request count
5. Request validated against Pydantic model
6. Chat Service receives request
7. RAG Service:
   a. Generates query embedding
   b. Searches vector DB with metadata filters
   c. Re-ranks results
   d. Assembles context
8. LLM Service:
   a. Builds prompt with context
   b. Calls GPT-4/Claude API
   c. Streams response
9. Response formatted with sources
10. Saved to PostgreSQL
11. Returned to frontend
12. UI displays with citations
```

### Document Upload Flow

```
1. User uploads PDF via UploadModal
2. Frontend sends POST to /api/v1/upload-manual
3. File saved to temporary storage
4. Document record created in PostgreSQL
5. Celery task queued for processing
6. Background worker:
   a. Extracts text from PDF
   b. Cleans and preprocesses
   c. Splits into chunks
   d. Generates embeddings
   e. Stores in vector DB
   f. Updates document status
7. User notified of completion
```

## Scalability Considerations

### Horizontal Scaling

- **API Gateway**: Multiple FastAPI instances behind load balancer
- **Workers**: Celery workers for document processing
- **Database**: PostgreSQL read replicas
- **Vector DB**: Pinecone auto-scales

### Caching Strategy

```
┌─────────────────┐
│  Redis Cache    │
├─────────────────┤
│ • Query results │  TTL: 1 hour
│ • Embeddings    │  TTL: 24 hours
│ • Device list   │  TTL: 6 hours
│ • User sessions │  TTL: 30 min
└─────────────────┘
```

### Performance Optimization

- Connection pooling for databases
- Batch embedding generation
- Async I/O throughout
- CDN for static assets
- Lazy loading for UI components

## Security Architecture

### Authentication Flow

```
1. User login → JWT token issued (24h expiry)
2. Token stored in httpOnly cookie
3. Each request includes token in Authorization header
4. API validates signature and expiry
5. User context attached to request
```

### Data Protection

- Passwords: bcrypt hashing
- API keys: Environment variables + secrets manager
- Database: Encrypted at rest
- Transit: TLS 1.3
- Input sanitization: Prevent injection attacks

## Monitoring & Observability

### Metrics to Track

- Request latency (p50, p95, p99)
- Error rates by endpoint
- Vector search performance
- LLM API latency
- Cache hit rates
- Active users
- Document processing queue length

### Logging Strategy

```python
{
    "timestamp": "2026-02-09T22:19:15Z",
    "level": "INFO",
    "service": "chat_service",
    "trace_id": "abc123",
    "user_id": "user_456",
    "endpoint": "/api/v1/chat",
    "latency_ms": 1234,
    "status": 200
}
```

### Tools

- Prometheus for metrics
- Grafana for dashboards
- ELK stack for logs
- Sentry for error tracking

## Deployment Architecture

### Development

```
docker-compose.yml
├── frontend (React dev server)
├── backend (FastAPI with hot reload)
├── chromadb (local vector DB)
├── postgres (local DB)
└── redis (local cache)
```

### Production (Kubernetes)

```
Kubernetes Cluster
├── Ingress (NGINX)
├── Frontend Deployment (3 replicas)
├── Backend Deployment (5 replicas)
├── Worker Deployment (3 replicas)
├── PostgreSQL StatefulSet
├── Redis Deployment
└── External Services:
    ├── Pinecone (Vector DB)
    ├── OpenAI API
    └── S3 (Document storage)
```

## Disaster Recovery

- Database backups: Daily full + hourly incremental
- Vector DB snapshots: Weekly
- Document storage: S3 versioning enabled
- RTO: 4 hours
- RPO: 1 hour

## Cost Estimation (Monthly)

- **Compute**: $500 (Kubernetes cluster)
- **Vector DB**: $200 (Pinecone)
- **LLM API**: $1000 (OpenAI GPT-4)
- **Storage**: $100 (S3)
- **Database**: $150 (Managed PostgreSQL)
- **Total**: ~$2000/month for 10,000 queries/day
