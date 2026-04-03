"""
Authentication API endpoints.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from datetime import timedelta, datetime, timezone
import logging

from app.models.database import User, Conversation, Message, Feedback
from app.models.schemas import (
    UserCreate, UserLogin, Token, UserResponse,
    UserProfileResponse, UserUpdate, ChangePasswordRequest
)
from app.core.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_active_user
)
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


# ── REGISTER ──────────────────────────────────────────────────────────────────

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """Register a new user."""
    existing_user = await User.find_one(User.email == user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    hashed_password = get_password_hash(user_data.password)
    user = User(email=user_data.email, hashed_password=hashed_password)
    await user.insert()
    logger.info(f"New user registered: {user.email}")

    return UserResponse(
        user_id=user.user_id,
        email=user.email,
        is_active=user.is_active,
        created_at=user.created_at
    )


# ── LOGIN ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=Token)
async def login(user_data: UserLogin):
    """Login and receive access token."""
    user = await User.find_one(User.email == user_data.email)

    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account"
        )

    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=access_token_expires
    )
    logger.info(f"User logged in: {user.email}")
    return Token(access_token=access_token, token_type="bearer")


# ── READ ──────────────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserProfileResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get current user's full profile."""
    return UserProfileResponse(
        user_id=current_user.user_id,
        email=current_user.email,
        full_name=current_user.full_name,
        bio=current_user.bio,
        avatar_color=current_user.avatar_color,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
    )


# ── UPDATE profile ────────────────────────────────────────────────────────────

@router.put("/me", response_model=UserProfileResponse)
async def update_profile(
    data: UserUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Update full_name, bio, and/or avatar_color."""
    update_fields: dict = {}

    if data.full_name is not None:
        update_fields["full_name"] = data.full_name
    if data.bio is not None:
        update_fields["bio"] = data.bio
    if data.avatar_color is not None:
        update_fields["avatar_color"] = data.avatar_color

    if not update_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided to update"
        )

    update_fields["updated_at"] = datetime.now(timezone.utc)
    await current_user.update({"$set": update_fields})
    await current_user.sync()

    logger.info(f"Profile updated for: {current_user.email}")
    return UserProfileResponse(
        user_id=current_user.user_id,
        email=current_user.email,
        full_name=current_user.full_name,
        bio=current_user.bio,
        avatar_color=current_user.avatar_color,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
    )


# ── UPDATE password ───────────────────────────────────────────────────────────

@router.put("/me/password", status_code=status.HTTP_200_OK)
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Change the authenticated user's password."""
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    new_hash = get_password_hash(data.new_password)
    await current_user.update({
        "$set": {
            "hashed_password": new_hash,
            "updated_at": datetime.now(timezone.utc)
        }
    })
    logger.info(f"Password changed for: {current_user.email}")
    return {"message": "Password updated successfully"}


# ── DELETE account ────────────────────────────────────────────────────────────

@router.delete("/me", status_code=status.HTTP_200_OK)
async def delete_account(current_user: User = Depends(get_current_active_user)):
    """
    Permanently delete the authenticated user's account.
    Cascades to conversations, messages and feedback owned by the user.
    """
    conversations = await Conversation.find(
        Conversation.user.id == current_user.id  # type: ignore[attr-defined]
    ).to_list()

    for conv in conversations:
        messages = await Message.find(
            Message.conversation.id == conv.id  # type: ignore[attr-defined]
        ).to_list()
        for msg in messages:
            await Feedback.find(
                Feedback.message.id == msg.id  # type: ignore[attr-defined]
            ).delete()
            await msg.delete()
        await conv.delete()

    await current_user.delete()
    logger.info(f"Account deleted: {current_user.email}")
    return {"message": "Account deleted successfully"}
