"""
Document processing service for extracting and indexing manual content.
"""

import logging
from typing import List, Dict, Any
from datetime import datetime
import PyPDF2
import pdfplumber
from pathlib import Path

from app.models.database import ManualDocument, DocumentStatus
from app.services.rag_service import rag_service
from app.core.config import settings

logger = logging.getLogger(__name__)


class DocumentProcessor:
    """Process uploaded documents and index them in the vector store."""
    
    def __init__(self):
        """Initialize document processor."""
        self.text_splitter = rag_service.text_splitter
    
    async def extract_text_from_pdf(self, file_path: str) -> str:
        """
        Extract text from PDF file.
        
        Args:
            file_path: Path to PDF file
            
        Returns:
            Extracted text content
        """
        import asyncio
        from functools import partial
        
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            None, 
            partial(self._extract_text_sync, file_path)
        )

    def _extract_text_sync(self, file_path: str) -> str:
        """Synchronous helper for PDF extraction."""
        text = ""
        try:
            # Try pdfplumber first (better for complex layouts)
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n\n"
            
            if text.strip():
                logger.info(f"Extracted {len(text)} characters using pdfplumber")
                return text
                
        except Exception as e:
            logger.warning(f"pdfplumber extraction failed: {e}, trying PyPDF2")
        
        try:
            # Fallback to PyPDF2
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n\n"
            
            logger.info(f"Extracted {len(text)} characters using PyPDF2")
            return text
            
        except Exception as e:
            logger.error(f"PDF extraction failed: {e}")
            raise
    
    def clean_text(self, text: str) -> str:
        """
        Clean extracted text.
        
        Args:
            text: Raw extracted text
            
        Returns:
            Cleaned text
        """
        # Remove excessive whitespace
        lines = [line.strip() for line in text.split('\n')]
        lines = [line for line in lines if line]
        
        # Join lines
        cleaned = '\n'.join(lines)
        
        # Remove excessive newlines
        while '\n\n\n' in cleaned:
            cleaned = cleaned.replace('\n\n\n', '\n\n')
        
        return cleaned
    
    def extract_metadata_from_text(self, text: str) -> Dict[str, Any]:
        """
        Extract metadata from document text.
        
        Args:
            text: Document text
            
        Returns:
            Dictionary of extracted metadata
        """
        metadata = {}
        
        # Simple heuristics to extract common metadata
        lines = text.split('\n')[:50]  # Check first 50 lines
        
        for line in lines:
            line_lower = line.lower()
            
            # Look for model numbers (simple pattern)
            if 'model' in line_lower and len(line) < 100:
                metadata['detected_model'] = line.strip()
            
            # Look for manual type
            if 'troubleshooting' in line_lower:
                metadata['section_type'] = 'troubleshooting'
            elif 'installation' in line_lower:
                metadata['section_type'] = 'installation'
            elif 'user guide' in line_lower or 'user manual' in line_lower:
                metadata['section_type'] = 'user_guide'
        
        return metadata
    
    async def process_document(self, document_id: str) -> bool:
        """
        Process a document: extract text, chunk, and index.
        
        Args:
            document_id: MongoDB document ID
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Get document from database
            document = await ManualDocument.get(document_id)
            
            if not document:
                logger.error(f"Document {document_id} not found")
                return False
            
            logger.info(f"Processing document: {document.filename}")
            
            # Update status to processing
            document.status = DocumentStatus.PROCESSING
            await document.save()
            
            # Extract text based on file type
            file_ext = Path(document.file_path).suffix.lower()
            
            if file_ext == '.pdf':
                text = await self.extract_text_from_pdf(document.file_path)
            elif file_ext in ['.txt', '.text']:
                with open(document.file_path, 'r', encoding='utf-8') as f:
                    text = f.read()
            else:
                raise ValueError(f"Unsupported file type: {file_ext}")
            
            if not text or len(text.strip()) < 100:
                raise ValueError("Insufficient text extracted from document")
            
            # Clean text
            text = self.clean_text(text)
            
            # Extract additional metadata
            auto_metadata = self.extract_metadata_from_text(text)
            
            # Split into chunks
            chunks = self.text_splitter.split_text(text)
            logger.info(f"Split document into {len(chunks)} chunks")
            
            # Prepare metadata for each chunk
            metadatas = []
            for i, chunk in enumerate(chunks):
                chunk_metadata = {
                    "source_file": document.filename,
                    "device_type": document.device_type,
                    "brand": document.brand,
                    "model": document.model or "Unknown",
                    "document_id": document.document_id,
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                    **auto_metadata
                }
                metadatas.append(chunk_metadata)
            
            # Add to vector store
            chunks_added = await rag_service.add_documents(
                texts=chunks,
                metadatas=metadatas
            )
            
            # Update document status
            document.status = DocumentStatus.INDEXED
            document.chunks_count = chunks_added
            document.processed_at = datetime.utcnow()
            await document.save()
            
            logger.info(f"Successfully processed document: {document.filename}")
            return True
            
        except Exception as e:
            logger.error(f"Error processing document: {e}")
            
            # Update document status to failed
            try:
                document = await ManualDocument.get(document_id)
                if document:
                    document.status = DocumentStatus.FAILED
                    document.error_message = str(e)
                    await document.save()
            except Exception as save_error:
                logger.error(f"Error updating document status: {save_error}")
            
            return False


# Celery task (placeholder - would be implemented with Celery)
async def process_document_task(document_id: str):
    """
    Background task to process a document.
    
    Args:
        document_id: Document ID to process
    """
    processor = DocumentProcessor()
    await processor.process_document(document_id)
