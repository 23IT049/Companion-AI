"""
Feedback API endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status
import logging

from app.models.database import User, Message, Feedback as FeedbackModel
from app.models.schemas import FeedbackRequest, FeedbackResponse
from app.core.auth import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    feedback_request: FeedbackRequest,
    current_user: User = Depends(get_current_active_user)
):
    """
    Submit feedback on an assistant message.
    
    Args:
        feedback_request: Feedback data
        current_user: Authenticated user
        
    Returns:
        Feedback confirmation
    """
    try:
        # Find message
        message = await Message.find_one(
            Message.message_id == feedback_request.message_id
        )
        
        if not message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found"
            )
        
        # Verify message belongs to user's conversation
        await message.fetch_link(Message.conversation)
        await message.conversation.fetch_link(message.conversation.user)
        
        if message.conversation.user.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to provide feedback on this message"
            )
        
        # Check if feedback already exists
        existing_feedback = await FeedbackModel.find_one(
            FeedbackModel.message.id == message.id
        )
        
        if existing_feedback:
            # Update existing feedback
            existing_feedback.rating = feedback_request.rating
            existing_feedback.comment = feedback_request.comment
            await existing_feedback.save()
            
            logger.info(f"Updated feedback for message {message.message_id}")
            
            return FeedbackResponse(
                feedback_id=existing_feedback.feedback_id,
                message="Feedback updated successfully"
            )
        else:
            # Create new feedback
            feedback = FeedbackModel(
                message=message,
                rating=feedback_request.rating,
                comment=feedback_request.comment
            )
            await feedback.insert()
            
            logger.info(f"Created feedback for message {message.message_id}")
            
            return FeedbackResponse(
                feedback_id=feedback.feedback_id,
                message="Feedback submitted successfully"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting feedback: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error submitting feedback: {str(e)}"
        )
