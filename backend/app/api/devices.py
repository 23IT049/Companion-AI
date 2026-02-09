"""
Device catalog API endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
import logging

from app.models.database import DeviceCategory
from app.models.schemas import DeviceListResponse, DeviceInfo
from app.core.auth import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/devices", response_model=DeviceListResponse)
async def list_devices():
    """
    Get list of supported devices with brands and models.
    
    Returns:
        List of device categories with supported brands and models
    """
    try:
        # Get all device categories
        categories = await DeviceCategory.find_all().to_list()
        
        # Format response
        devices = [
            DeviceInfo(
                device_type=category.name,
                brands=category.brands,
                models=category.models
            )
            for category in categories
        ]
        
        return DeviceListResponse(
            devices=devices,
            total_count=len(devices)
        )
        
    except Exception as e:
        logger.error(f"Error listing devices: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving device list"
        )


@router.get("/devices/{device_type}")
async def get_device_info(device_type: str):
    """
    Get information about a specific device type.
    
    Args:
        device_type: Type of device
        
    Returns:
        Device information with brands and models
    """
    category = await DeviceCategory.find_one(DeviceCategory.name == device_type)
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device type '{device_type}' not found"
        )
    
    return DeviceInfo(
        device_type=category.name,
        brands=category.brands,
        models=category.models
    )
