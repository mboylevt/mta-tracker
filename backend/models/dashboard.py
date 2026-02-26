import uuid

from pydantic import BaseModel, Field


class SubwayStopConfig(BaseModel):
    stop_id: str  # Parent stop ID without N/S suffix, e.g. "R01"
    name: str
    lines: list[str] = []


class BusStopConfig(BaseModel):
    stop_id: str  # MTA bus stop code, e.g. "553026"
    name: str
    routes: list[str] = []


class CitibikeStationConfig(BaseModel):
    station_id: str  # Short name, e.g. "7186.15"
    name: str


class DashboardConfig(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:8])
    name: str
    subway_stops: list[SubwayStopConfig] = []
    bus_stops: list[BusStopConfig] = []
    citibike_stations: list[CitibikeStationConfig] = []


class DashboardSummary(BaseModel):
    id: str
    name: str
    subway_stop_count: int
    bus_stop_count: int
    citibike_station_count: int
