from pydantic import BaseModel


class SubwayArrival(BaseModel):
    line: str
    direction: str
    arrival_time: str  # ISO 8601
    minutes_until_arrival: float
    headsign: str
    is_delayed: bool


class SubwayStationData(BaseModel):
    stop_id: str
    station_name: str = ""
    northbound: list[SubwayArrival] = []
    southbound: list[SubwayArrival] = []


class SubwayResponse(BaseModel):
    stations: list[SubwayStationData] = []
    updated_at: str = ""
    error: str | None = None


class BusArrival(BaseModel):
    route: str
    direction: str
    minutes_until_arrival: float
    distance_text: str
    stop_name: str


class BusResponse(BaseModel):
    arrivals: list[BusArrival] = []
    updated_at: str = ""
    error: str | None = None
