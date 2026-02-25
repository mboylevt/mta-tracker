import logging

from fastapi import APIRouter, HTTPException

from backend.models.arrivals import BusResponse
from backend.services.bus_service import get_bus_arrivals

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/bus", response_model=BusResponse)
async def bus_arrivals():
    try:
        return await get_bus_arrivals()
    except Exception:
        logger.exception("Failed to fetch bus arrivals")
        raise HTTPException(status_code=502, detail="Failed to fetch bus data from MTA")
