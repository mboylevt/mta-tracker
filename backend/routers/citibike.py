import logging

from fastapi import APIRouter, HTTPException, Query

from backend.services.citibike_service import get_citibike_status

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/citibike")
async def citibike_status(station_ids: str = Query(default="")):
    ids = [s.strip() for s in station_ids.split(",") if s.strip()]
    if not ids:
        return {"stations": [], "updated_at": ""}
    try:
        return await get_citibike_status(ids)
    except Exception:
        logger.exception("Failed to fetch Citibike status")
        raise HTTPException(
            status_code=502, detail="Failed to fetch Citibike data"
        )
