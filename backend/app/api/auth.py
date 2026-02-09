"""
Authentication API endpoints.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from datetime import timedelta
import logging

from app.models.database import User
from app.models.schemas import UserCreate, UserLogin, Token, UserResponse
from app.core.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_active_user
)
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """
    Register a new user.
    
    Args:
        user_data: User registration data
        
    Returns:
        Created user information
        
    Raises:
        HTTPException: If email already exists
    """
    # Check if user already exists
    existing_user = await User.find_one(User.email == user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        hashed_password=hashed_password
    )
    
    await user.insert()
    logger.info(f"New user registered: {user.email}")
    
    return UserResponse(
        user_id=user.user_id,
        email=user.email,
        is_active=user.is_active,
        created_at=user.created_at
    )


@router.post("/login", response_model=Token)
async def login(user_data: UserLogin):
    """
    Login and receive access token.
    
    Args:
        user_data: User login credentials
        
    Returns:
        JWT access token
        
    Raises:
        HTTPException: If credentials are invalid
    """
    # Find user
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
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=access_token_expires
    )
    
    logger.info(f"User logged in: {user.email}")
    
    return Token(access_token=access_token, token_type="bearer")


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """
    Get current user information.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        User information
    """
    return UserResponse(
        user_id=current_user.user_id,
        email=current_user.email,
        is_active=current_user.is_active,
        created_at=current_user.created_at
    )
