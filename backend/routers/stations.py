import logging

from fastapi import APIRouter, Query

from backend.services.station_lookup import search_bus, search_citibike, search_subway

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/stations")


@router.get("/subway")
async def subway_stations(q: str = Query(default="")):
    return await search_subway(q)


@router.get("/bus")
async def bus_stops(q: str = Query(default="")):
    return await search_bus(q)


@router.get("/citibike")
async def citibike_stations(q: str = Query(default="")):
    return await search_citibike(q)
