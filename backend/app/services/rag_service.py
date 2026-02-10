"""
RAG (Retrieval Augmented Generation) service for document-based Q&A.
"""

from typing import List, Dict, Any, Optional
import logging
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
import chromadb

from app.core.config import settings

logger = logging.getLogger(__name__)


class RAGService:
    """Service for RAG-based document retrieval and question answering."""
    
    def __init__(self):
        """Initialize RAG service with embeddings and vector store."""
        self.embeddings = None
        self.vector_store = None
        self.llm = None
        self.text_splitter = None
        self._initialize()
    
    def _initialize(self):
        """Initialize components."""
        try:
            # Initialize embeddings model
            logger.info(f"Loading embedding model: {settings.embedding_model}")
            self.embeddings = HuggingFaceEmbeddings(
                model_name=settings.embedding_model,
                model_kwargs={'device': 'cpu'},
                encode_kwargs={'normalize_embeddings': True}
            )
            
            # Initialize text splitter
            self.text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=settings.chunk_size,
                chunk_overlap=settings.chunk_overlap,
                length_function=len,
                separators=["\n\n", "\n", " ", ""]
            )
            
            # Initialize ChromaDB client
            chroma_client = chromadb.HttpClient(
                host=settings.chroma_host,
                port=settings.chroma_port
            )
            
            # Initialize vector store
            self.vector_store = Chroma(
                client=chroma_client,
                collection_name=settings.chroma_collection_name,
                embedding_function=self.embeddings
            )
            
            # Initialize LLM
            if settings.llm_provider == "openai":
                self.llm = ChatOpenAI(
                    model_name=settings.llm_model,
                    temperature=settings.llm_temperature,
                    max_tokens=settings.llm_max_tokens,
                    openai_api_key=settings.openai_api_key
                )
            elif settings.llm_provider == "google":
                self.llm = ChatGoogleGenerativeAI(
                    model=settings.llm_model,
                    temperature=settings.llm_temperature,
                    google_api_key=settings.google_api_key
                )
            else:
                raise ValueError(f"Unsupported LLM provider: {settings.llm_provider}")
            
            logger.info("RAG service initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize RAG service: {e}")
            raise
    
    def create_prompt_template(self) -> PromptTemplate:
        """
        Create the prompt template for troubleshooting.
        
        Returns:
            Configured prompt template
        """
        template = """You are an expert device repair technician with years of experience troubleshooting various household appliances and electronics.

Using the manual excerpts provided below, provide clear, step-by-step troubleshooting instructions for the user's problem.

Context from device manuals:
{context}

User Question: {question}

Instructions for your response:
1. Start by diagnosing the most likely cause of the problem
2. Provide clear, numbered step-by-step troubleshooting instructions
3. Include any relevant safety warnings (electrical hazards, water damage risks, etc.)
4. Cite the specific manual section you're referencing
5. If the problem requires professional repair, clearly state this
6. If the provided context doesn't contain relevant information, honestly say "I don't have specific information about this in the available manuals" and provide general guidance if appropriate

Important:
- Be conversational and friendly, but professional
- Use simple language, avoiding technical jargon when possible
- If you use technical terms, briefly explain them
- Prioritize user safety above all else

Your response:"""
        
        return PromptTemplate(
            template=template,
            input_variables=["context", "question"]
        )
    
    async def retrieve_relevant_chunks(
        self,
        query: str,
        device_type: Optional[str] = None,
        brand: Optional[str] = None,
        model: Optional[str] = None,
        top_k: int = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieve relevant document chunks for a query.
        
        Args:
            query: User's question
            device_type: Optional device type filter
            brand: Optional brand filter
            model: Optional model filter
            top_k: Number of chunks to retrieve
            
        Returns:
            List of relevant chunks with metadata
        """
        if top_k is None:
            top_k = settings.retrieval_top_k
        
        try:
            # Build metadata filter
            filter_dict = {}
            if device_type:
                filter_dict["device_type"] = device_type
            if brand:
                filter_dict["brand"] = brand
            if model:
                filter_dict["model"] = model
            
            # Perform similarity search
            if filter_dict:
                results = self.vector_store.similarity_search_with_score(
                    query,
                    k=top_k,
                    filter=filter_dict
                )
            else:
                results = self.vector_store.similarity_search_with_score(
                    query,
                    k=top_k
                )
            
            # Format results
            chunks = []
            for doc, score in results:
                # Convert distance to similarity score (lower distance = higher similarity)
                relevance_score = 1 / (1 + score)
                
                # Only include chunks above relevance threshold
                if relevance_score >= settings.relevance_threshold:
                    chunks.append({
                        "content": doc.page_content,
                        "source_file": doc.metadata.get("source_file", "Unknown"),
                        "page_number": doc.metadata.get("page_number"),
                        "section_name": doc.metadata.get("section_name"),
                        "relevance_score": round(relevance_score, 3),
                        "device_type": doc.metadata.get("device_type"),
                        "brand": doc.metadata.get("brand"),
                        "model": doc.metadata.get("model")
                    })
            
            logger.info(f"Retrieved {len(chunks)} relevant chunks for query: {query[:50]}...")
            return chunks
            
        except Exception as e:
            logger.error(f"Error retrieving chunks: {e}")
            return []
    
    async def generate_answer(
        self,
        query: str,
        device_type: Optional[str] = None,
        brand: Optional[str] = None,
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate an answer using RAG.
        
        Args:
            query: User's question
            device_type: Optional device type
            brand: Optional brand
            model: Optional model
            
        Returns:
            Dictionary with answer and sources
        """
        try:
            # Retrieve relevant chunks
            chunks = await self.retrieve_relevant_chunks(
                query=query,
                device_type=device_type,
                brand=brand,
                model=model
            )
            
            if not chunks:
                return {
                    "answer": "I don't have specific information about this issue in the available manuals. "
                             "I recommend checking the device's official manual or contacting customer support for assistance.",
                    "sources": []
                }
            
            # Create context from chunks
            context = "\n\n".join([
                f"[Source: {chunk['source_file']}, Page: {chunk.get('page_number', 'N/A')}]\n{chunk['content']}"
                for chunk in chunks
            ])
            
            # Create prompt
            prompt_template = self.create_prompt_template()
            prompt = prompt_template.format(context=context, question=query)
            
            # Generate answer
            response = await self.llm.ainvoke(prompt)
            answer = response.content if hasattr(response, 'content') else str(response)
            
            # Format sources for response
            sources = [
                {
                    "content": chunk["content"][:200] + "..." if len(chunk["content"]) > 200 else chunk["content"],
                    "source_file": chunk["source_file"],
                    "page_number": chunk.get("page_number"),
                    "section_name": chunk.get("section_name"),
                    "relevance_score": chunk["relevance_score"]
                }
                for chunk in chunks[:5]  # Return top 5 sources
            ]
            
            return {
                "answer": answer,
                "sources": sources
            }
            
        except Exception as e:
            logger.error(f"Error generating answer: {e}")
            raise
    
    async def add_documents(
        self,
        texts: List[str],
        metadatas: List[Dict[str, Any]]
    ) -> int:
        """
        Add documents to the vector store.
        
        Args:
            texts: List of text chunks
            metadatas: List of metadata dictionaries
            
        Returns:
            Number of chunks added
        """
        try:
            self.vector_store.add_texts(
                texts=texts,
                metadatas=metadatas
            )
            logger.info(f"Added {len(texts)} chunks to vector store")
            return len(texts)
            
        except Exception as e:
            logger.error(f"Error adding documents: {e}")
            raise


# Global RAG service instance
rag_service = RAGService()
