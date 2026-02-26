import logging

from fastapi import APIRouter, HTTPException, Query

from backend.services.bus_service import get_bus_arrivals

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/bus")
async def bus_arrivals(stop_ids: str = Query(default="")):
    ids = [s.strip() for s in stop_ids.split(",") if s.strip()]
    if not ids:
        return {"arrivals": [], "updated_at": ""}
    try:
        return await get_bus_arrivals(ids)
    except Exception:
        logger.exception("Failed to fetch bus arrivals")
        raise HTTPException(
            status_code=502, detail="Failed to fetch bus data from MTA"
        )
