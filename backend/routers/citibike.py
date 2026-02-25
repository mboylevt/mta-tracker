import logging

from fastapi import APIRouter, HTTPException

from backend.services.citibike_service import get_citibike_status

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/citibike")
async def citibike_status():
    try:
        return await get_citibike_status()
    except Exception:
        logger.exception("Failed to fetch Citibike status")
        raise HTTPException(status_code=502, detail="Failed to fetch Citibike data")
