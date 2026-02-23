# RAG Architecture

This document describes the Retrieval Augmented Generation (RAG) system implemented in `backend/app/services/`.

---

## How It Works — End to End

```
                        INDEXING PIPELINE (on upload)
        ┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌─────────────┐
        │  PDF/TXT │───▶│ Text Extract │───▶│  Chunking    │───▶│  Embedding  │
        │  Upload  │    │ (pdfplumber/ │    │  (LangChain  │    │  (HuggingF- │
        └──────────┘    │  PyPDF2)     │    │  splitter)   │    │  ace MiniLM)│
                        └──────────────┘    └──────────────┘    └──────┬──────┘
                                                                        │
                                                                        ▼
                                                               ┌─────────────────┐
                                                               │  ChromaDB       │
                                                               │  (vector store) │
                                                               └─────────────────┘

                        QUERY PIPELINE (on chat message)
        ┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌─────────────┐
        │  User    │───▶│  Embed query │───▶│  Similarity  │───▶│  Top-k      │
        │  Query   │    │  (MiniLM)    │    │  Search +    │    │  chunks     │
        └──────────┘    └──────────────┘    │  metadata    │    │  (filtered) │
                                            │  filter      │    └──────┬──────┘
                                            └──────────────┘           │
                                                                        ▼
                                                              ┌──────────────────┐
                                                              │  Prompt Assembly │
                                                              │  context+question│
                                                              └────────┬─────────┘
                                                                       │
                                                                       ▼
                                                              ┌──────────────────┐
                                                              │  LLM (GPT-4 /    │
                                                              │  Gemini)         │
                                                              └────────┬─────────┘
                                                                       │
                                                                       ▼
                                                              ┌──────────────────┐
                                                              │  Answer +        │
                                                              │  Source Citations│
                                                              └──────────────────┘
```

---

## Indexing Pipeline

### 1. Text Extraction (`DocumentProcessor`)

**File:** `app/services/document_processor.py`

Supports PDF and plain text files. For PDFs, it tries two extractors:

| Extractor | When used |
|---|---|
| `pdfplumber` | First attempt — better for complex layouts, tables |
| `PyPDF2` | Fallback if pdfplumber fails |

After extraction the text is cleaned: strips blank lines, collapses consecutive newlines.

It also scans the first 50 lines for auto-metadata hints:
- Detects `model` mentions → `detected_model`
- Detects section type from keywords: `troubleshooting`, `installation`, `user guide`

### 2. Chunking (`RecursiveCharacterTextSplitter`)

**File:** `app/services/rag_service.py` — `_initialize()`

```python
RecursiveCharacterTextSplitter(
    chunk_size=1000,       # configurable via CHUNK_SIZE env var
    chunk_overlap=200,     # configurable via CHUNK_OVERLAP env var
    separators=["\n\n", "\n", " ", ""]
)
```

Splits by double-newline first (paragraph), then single newline, then space, then characters — ensuring chunks respect document structure.

### 3. Metadata per Chunk

Each chunk is stored with:

```python
{
    "source_file": "Samsung_TV_Q7F_Manual.pdf",
    "device_type": "TV",
    "brand": "Samsung",
    "model": "Q7F",           # or "Unknown" if not provided
    "document_id": "<uuid>",
    "chunk_index": 0,
    "total_chunks": 42,
    # + any auto-detected metadata (section_type, detected_model)
}
```

### 4. Embedding & Storage

**Embedding model:** `sentence-transformers/all-MiniLM-L6-v2` (runs locally on CPU)
- Dimension: 384
- Embeddings are L2-normalized (`normalize_embeddings=True`)

**Vector store:** ChromaDB HTTP client connecting to `localhost:8001`
- Collection name: `device_manuals` (configurable)
- Chunks added via `vector_store.add_texts(texts, metadatas)`
- Runs in a thread executor to avoid blocking the FastAPI async loop

---

## Query Pipeline

### 1. Metadata Filtering

User can optionally filter by `device_type`, `brand`, and/or `model`. These map directly to ChromaDB `where` clauses:

```python
# Single filter
{"device_type": "TV"}

# Multiple filters use $and
{"$and": [{"device_type": "TV"}, {"brand": "Samsung"}]}
```

### 2. Similarity Search

```python
vector_store.similarity_search_with_score(query, k=5)
```

Default `top_k = 5` (configurable via `RETRIEVAL_TOP_K`).

Returns `(Document, distance_score)` pairs. Distance is converted to a relevance score:

```python
relevance_score = 1 / (1 + distance)
```

Chunks below the relevance threshold (`0.3` default, via `RELEVANCE_THRESHOLD`) are discarded.

### 3. Prompt Assembly

All passing chunks are formatted as:

```
[Source: Samsung_TV_Q7F_Manual.pdf, Page: 12]
<chunk text>

[Source: Samsung_TV_Q7F_Manual.pdf, Page: 13]
<chunk text>
...
```

This context is injected into the prompt template alongside the user's question.

### 4. Prompt Template

The system prompt instructs the LLM to act as a device repair technician:

- Diagnose the most likely cause
- Provide numbered step-by-step instructions
- Include safety warnings (electrical, water)
- Cite the manual section being referenced
- Recommend professional help when needed
- If no relevant context, admit it honestly rather than hallucinating

### 5. LLM Generation

**File:** `app/services/rag_service.py` — `generate_answer()`

Supports two providers (configured via `LLM_PROVIDER` env var):

| Provider | Model | Config key |
|---|---|---|
| `openai` | `gpt-4-turbo-preview` | `OPENAI_API_KEY` |
| `google` | configurable | `GOOGLE_API_KEY` |

Default settings:
```
temperature = 0.3   (low = more factual, less creative)
max_tokens  = 1000
```

Uses `llm.ainvoke(prompt)` — fully async.

### 6. Response

Returns up to **5 source citations** alongside the answer:

```json
{
  "answer": "...",
  "sources": [
    {
      "content": "first 200 chars of chunk...",
      "source_file": "Samsung_TV_Q7F_Manual.pdf",
      "page_number": 12,
      "section_name": "Troubleshooting",
      "relevance_score": 0.847
    }
  ]
}
```

---

## Document Lifecycle in MongoDB

```
Upload → PENDING → PROCESSING → INDEXED
                              → FAILED (on error, with error_message)
```

`ManualDocument` stores: filename, device_type, brand, model, file_path, file_size, status, chunks_count, processed_at.

---

## Configuration Reference

All values are overridable via `.env`:

| Variable | Default | Description |
|---|---|---|
| `EMBEDDING_MODEL` | `sentence-transformers/all-MiniLM-L6-v2` | HuggingFace embedding model |
| `EMBEDDING_DIMENSION` | `384` | Vector dimension |
| `CHUNK_SIZE` | `1000` | Max characters per chunk |
| `CHUNK_OVERLAP` | `200` | Overlap between adjacent chunks |
| `RETRIEVAL_TOP_K` | `5` | Number of chunks retrieved per query |
| `RELEVANCE_THRESHOLD` | `0.3` | Min relevance score to include a chunk |
| `LLM_PROVIDER` | `openai` | `openai` or `google` |
| `LLM_MODEL` | `gpt-4-turbo-preview` | Model name |
| `LLM_TEMPERATURE` | `0.3` | Generation temperature (0 = deterministic) |
| `LLM_MAX_TOKENS` | `1000` | Max tokens in LLM response |
| `CHROMA_HOST` | `localhost` | ChromaDB server host |
| `CHROMA_PORT` | `8001` | ChromaDB server port |
| `CHROMA_COLLECTION_NAME` | `device_manuals` | ChromaDB collection |

---

## Key Files

```
backend/app/services/
├── rag_service.py          # RAGService class — embeddings, vector store, LLM, retrieval
└── document_processor.py   # DocumentProcessor class — PDF extraction, chunking, indexing

backend/app/api/
├── chat.py                 # POST /chat — calls rag_service.generate_answer()
└── documents.py            # POST /upload-manual — calls DocumentProcessor.process_document()

backend/app/core/
└── config.py               # All RAG settings (chunk_size, top_k, threshold, etc.)
```
