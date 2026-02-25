import logging

from fastapi import APIRouter, HTTPException

from backend.models.arrivals import SubwayResponse
from backend.services.subway_service import get_subway_arrivals

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/subway", response_model=SubwayResponse)
async def subway_arrivals():
    try:
        return await get_subway_arrivals()
    except Exception:
        logger.exception("Failed to fetch subway arrivals")
        raise HTTPException(status_code=502, detail="Failed to fetch subway data from MTA")
