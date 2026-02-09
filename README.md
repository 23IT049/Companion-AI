# AI Device Troubleshooting Chatbot

A complete AI-powered chatbot system for troubleshooting device problems using RAG (Retrieval Augmented Generation) technology.

## 🎯 System Overview

This application helps users troubleshoot device problems by:
- Answering queries in plain language
- Searching through product manuals and guides
- Providing step-by-step instructions with source citations
- Supporting multiple device types, brands, and models

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React.js with Tailwind CSS
- **Backend**: FastAPI (Python)
- **AI/ML**: LangChain + RAG
- **Vector Database**: ChromaDB (development) / Pinecone (production)
- **LLM**: OpenAI GPT-4 / Anthropic Claude
- **Deployment**: Docker + Kubernetes

### Components
1. **User Interface Layer** - React-based chat interface
2. **API Gateway** - FastAPI REST endpoints
3. **Document Processing Pipeline** - PDF/HTML/Text ingestion
4. **Vector Database** - Embeddings storage with metadata
5. **RAG Retrieval System** - Semantic search and ranking
6. **LLM Integration** - Response generation with citations

## 📁 Project Structure

```
companion-ai/
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── services/        # API integration
│   │   ├── hooks/           # Custom React hooks
│   │   └── utils/           # Helper functions
│   └── package.json
├── backend/                  # FastAPI application
│   ├── app/
│   │   ├── api/             # API endpoints
│   │   ├── core/            # Configuration
│   │   ├── models/          # Data models
│   │   ├── services/        # Business logic
│   │   └── rag/             # RAG implementation
│   ├── requirements.txt
│   └── Dockerfile
├── data/                     # Document storage
│   ├── raw/                 # Original manuals
│   ├── processed/           # Processed chunks
│   └── metadata/            # Device catalog
├── scripts/                  # Utility scripts
│   ├── data_collection/     # Web scraping
│   ├── preprocessing/       # Document processing
│   └── deployment/          # Deployment scripts
├── docker-compose.yml
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- Docker & Docker Compose
- OpenAI API key or Anthropic API key

### Installation

1. Clone the repository
2. Set up environment variables
3. Install dependencies
4. Run with Docker Compose

See detailed instructions in `/docs/installation.md`

## 📊 Performance Targets

- **Concurrent Users**: 1000+
- **Response Time**: < 3 seconds
- **Supported Formats**: PDF, HTML, Text
- **Uptime**: 99.9%

## 📖 Documentation

- [System Architecture](docs/architecture.md)
- [API Documentation](docs/api.md)
- [Frontend Guide](docs/frontend.md)
- [RAG Implementation](docs/rag.md)
- [Data Preparation](docs/data-preparation.md)
- [Deployment Guide](docs/deployment.md)

## 🔒 Security

- JWT authentication
- Rate limiting (100 req/min per user)
- CORS configuration
- Input validation
- API key encryption

## 📝 License

MIT License - See LICENSE file for details
