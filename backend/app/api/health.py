"""
Health check API endpoint.
"""

from fastapi import APIRouter, status
from datetime import datetime, timezone
import logging
import time

from app.models.schemas import HealthCheckResponse, HealthStatus, ServiceHealth
from app.core.database import Database
from app.core.config import settings
from app.services.rag_service import rag_service

logger = logging.getLogger(__name__)
router = APIRouter()


async def check_mongodb() -> ServiceHealth:
    """Check MongoDB connection health."""
    try:
        start_time = time.time()
        
        # Try to ping the database
        if Database.client:
            await Database.client.admin.command('ping')
            latency = (time.time() - start_time) * 1000
            
            return ServiceHealth(
                status=HealthStatus.HEALTHY,
                latency_ms=round(latency, 2)
            )
        else:
            return ServiceHealth(
                status=HealthStatus.UNHEALTHY,
                error="Database client not initialized"
            )
            
    except Exception as e:
        return ServiceHealth(
            status=HealthStatus.UNHEALTHY,
            error=str(e)
        )


async def check_vector_store() -> ServiceHealth:
    """Check vector store health."""
    try:
        start_time = time.time()
        
        # Try to access vector store
        if rag_service.vector_store:
            # Simple heartbeat check
            latency = (time.time() - start_time) * 1000
            
            return ServiceHealth(
                status=HealthStatus.HEALTHY,
                latency_ms=round(latency, 2)
            )
        else:
            return ServiceHealth(
                status=HealthStatus.UNHEALTHY,
                error="Vector store not initialized"
            )
            
    except Exception as e:
        return ServiceHealth(
            status=HealthStatus.UNHEALTHY,
            error=str(e)
        )


async def check_llm() -> ServiceHealth:
    """Check LLM service health."""
    try:
        if rag_service.llm:
            return ServiceHealth(
                status=HealthStatus.HEALTHY
            )
        else:
            return ServiceHealth(
                status=HealthStatus.DEGRADED,
                error="LLM not initialized"
            )
            
    except Exception as e:
        return ServiceHealth(
            status=HealthStatus.UNHEALTHY,
            error=str(e)
        )


@router.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """
    Comprehensive health check of all services.
    
    Returns:
        Health status of the application and its dependencies
    """
    # Check all services
    mongodb_health = await check_mongodb()
    vector_store_health = await check_vector_store()
    llm_health = await check_llm()
    
    # Determine overall status
    services = {
        "mongodb": mongodb_health,
        "vector_store": vector_store_health,
        "llm": llm_health
    }
    
    # Overall status logic
    if all(s.status == HealthStatus.HEALTHY for s in services.values()):
        overall_status = HealthStatus.HEALTHY
    elif any(s.status == HealthStatus.UNHEALTHY for s in services.values()):
        overall_status = HealthStatus.UNHEALTHY
    else:
        overall_status = HealthStatus.DEGRADED
    
    return HealthCheckResponse(
        status=overall_status,
        timestamp=datetime.now(timezone.utc),
        services=services,
        version="1.0.0"
    )


@router.get("/health/live")
async def liveness_probe():
    """
    Kubernetes liveness probe.
    Returns 200 if the application is running.
    """
    return {"status": "alive"}


@router.get("/health/ready")
async def readiness_probe():
    """
    Kubernetes readiness probe.
    Returns 200 if the application is ready to serve requests.
    """
    # Check critical services
    mongodb_health = await check_mongodb()
    
    if mongodb_health.status == HealthStatus.HEALTHY:
        return {"status": "ready"}
    else:
        return {"status": "not ready"}, status.HTTP_503_SERVICE_UNAVAILABLE
