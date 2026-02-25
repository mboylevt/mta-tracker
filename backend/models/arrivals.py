from pydantic import BaseModel


class SubwayArrival(BaseModel):
    line: str
    direction: str
    arrival_time: str  # ISO 8601
    minutes_until_arrival: float
    headsign: str
    is_delayed: bool


class SubwayResponse(BaseModel):
    station_name: str
    manhattan_bound: list[SubwayArrival]
    ditmars_bound: list[SubwayArrival]
    updated_at: str


class BusArrival(BaseModel):
    route: str
    direction: str
    minutes_until_arrival: float
    distance_text: str
    stop_name: str


class BusResponse(BaseModel):
    arrivals: list[BusArrival]
    updated_at: str


class ConfigResponse(BaseModel):
    refresh_interval_seconds: int
    station_name: str
    subway_lines: list[str]
    bus_stop_name: str
