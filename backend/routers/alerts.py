from fastapi import APIRouter, Query

from backend.services.alerts_service import get_alerts

router = APIRouter()


@router.get("/alerts")
async def alerts(
    subway_routes: str = Query("", description="Comma-separated subway lines, e.g. N,W,E"),
    bus_routes: str = Query("", description="Comma-separated bus routes, e.g. Q69,Q100"),
):
    subway = [r.strip() for r in subway_routes.split(",") if r.strip()] if subway_routes else []
    bus = [r.strip() for r in bus_routes.split(",") if r.strip()] if bus_routes else []
    return await get_alerts(subway_routes=subway, bus_routes=bus)
