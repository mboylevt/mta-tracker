import logging

from fastapi import APIRouter, HTTPException, Query

from backend.services.subway_service import get_subway_arrivals

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/subway")
async def subway_arrivals(stops: str = Query(default="")):
    """
    stops format: "R01:N,W;A27:A,C" or "R01;A27" (no line filter = all).
    Each entry is stop_id optionally followed by :line1,line2.
    Entries separated by semicolons.
    """
    if not stops:
        return {"stations": [], "updated_at": ""}

    stop_configs: list[dict] = []
    for part in stops.split(";"):
        part = part.strip()
        if not part:
            continue
        if ":" in part:
            stop_id, lines_str = part.split(":", 1)
            lines = [l.strip() for l in lines_str.split(",") if l.strip()]
        else:
            stop_id = part
            lines = []
        stop_configs.append({"stop_id": stop_id.strip(), "lines": lines})

    if not stop_configs:
        return {"stations": [], "updated_at": ""}

    try:
        return await get_subway_arrivals(stop_configs)
    except Exception:
        logger.exception("Failed to fetch subway arrivals")
        raise HTTPException(
            status_code=502, detail="Failed to fetch subway data from MTA"
        )
