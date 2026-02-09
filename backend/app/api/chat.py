"""
Chat API endpoints for conversational troubleshooting.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime
import logging

from app.models.database import User, Conversation, Message, MessageRole
from app.models.schemas import ChatRequest, ChatResponse, SourceCitation, ConversationHistoryResponse, MessageResponse, ConversationResponse
from app.core.auth import get_current_active_user
from app.services.rag_service import rag_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_active_user)
):
    """
    Handle chat requests with RAG-based responses.
    
    Args:
        request: Chat request with query and optional device info
        current_user: Authenticated user
        
    Returns:
        Chat response with answer and sources
    """
    try:
        # Get or create conversation
        if request.conversation_id:
            conversation = await Conversation.find_one(
                Conversation.conversation_id == request.conversation_id
            )
            if not conversation:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Conversation not found"
                )
            # Update conversation timestamp
            conversation.updated_at = datetime.utcnow()
            await conversation.save()
        else:
            # Create new conversation
            conversation = Conversation(
                user=current_user,
                device_type=request.device_type,
                brand=request.brand,
                model=request.model
            )
            await conversation.insert()
        
        # Save user message
        user_message = Message(
            conversation=conversation,
            role=MessageRole.USER,
            content=request.query
        )
        await user_message.insert()
        
        # Generate answer using RAG
        logger.info(f"Processing query: {request.query[:50]}...")
        result = await rag_service.generate_answer(
            query=request.query,
            device_type=request.device_type,
            brand=request.brand,
            model=request.model
        )
        
        # Format sources
        sources = [
            SourceCitation(**source) for source in result["sources"]
        ]
        
        # Save assistant message
        assistant_message = Message(
            conversation=conversation,
            role=MessageRole.ASSISTANT,
            content=result["answer"],
            sources=[source.dict() for source in sources]
        )
        await assistant_message.insert()
        
        logger.info(f"Generated response for conversation {conversation.conversation_id}")
        
        return ChatResponse(
            answer=result["answer"],
            sources=sources,
            conversation_id=conversation.conversation_id,
            message_id=assistant_message.message_id,
            timestamp=assistant_message.created_at
        )
        
    except Exception as e:
        logger.error(f"Error processing chat request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing request: {str(e)}"
        )


@router.get("/conversation/{conversation_id}", response_model=ConversationHistoryResponse)
async def get_conversation_history(
    conversation_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Get conversation history.
    
    Args:
        conversation_id: Conversation ID
        current_user: Authenticated user
        
    Returns:
        Conversation details with all messages
    """
    # Find conversation
    conversation = await Conversation.find_one(
        Conversation.conversation_id == conversation_id
    )
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Verify ownership
    await conversation.fetch_link(Conversation.user)
    if conversation.user.id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this conversation"
        )
    
    # Get all messages
    messages = await Message.find(
        Message.conversation.id == conversation.id
    ).sort("+created_at").to_list()
    
    # Format response
    message_responses = [
        MessageResponse(
            message_id=msg.message_id,
            role=msg.role.value,
            content=msg.content,
            sources=[SourceCitation(**s) for s in (msg.sources or [])],
            created_at=msg.created_at
        )
        for msg in messages
    ]
    
    return ConversationHistoryResponse(
        conversation=ConversationResponse(
            conversation_id=conversation.conversation_id,
            device_type=conversation.device_type,
            brand=conversation.brand,
            model=conversation.model,
            created_at=conversation.created_at,
            updated_at=conversation.updated_at,
            message_count=len(messages)
        ),
        messages=message_responses
    )


@router.get("/conversations", response_model=list[ConversationResponse])
async def list_conversations(
    current_user: User = Depends(get_current_active_user),
    limit: int = 20,
    skip: int = 0
):
    """
    List user's conversations.
    
    Args:
        current_user: Authenticated user
        limit: Maximum number of conversations to return
        skip: Number of conversations to skip
        
    Returns:
        List of conversations
    """
    conversations = await Conversation.find(
        Conversation.user.id == current_user.id
    ).sort("-updated_at").skip(skip).limit(limit).to_list()
    
    # Get message counts
    responses = []
    for conv in conversations:
        message_count = await Message.find(
            Message.conversation.id == conv.id
        ).count()
        
        responses.append(
            ConversationResponse(
                conversation_id=conv.conversation_id,
                device_type=conv.device_type,
                brand=conv.brand,
                model=conv.model,
                created_at=conv.created_at,
                updated_at=conv.updated_at,
                message_count=message_count
            )
        )
    
    return responses
