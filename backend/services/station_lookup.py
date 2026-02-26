"""Station lookup for subway, bus, and Citibike searches."""

import csv
import io
import logging
import zipfile
from pathlib import Path

import httpx

from backend.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Subway
# ---------------------------------------------------------------------------
GTFS_STATIC_URL = (
    "http://web.mta.info/developers/data/nyct/subway/google_transit.zip"
)

_subway_cache: list[dict] | None = None

# Approximate line associations by stop_id first character
_LINES_BY_PREFIX: dict[str, list[str]] = {
    "1": ["1", "2", "3"],
    "2": ["1", "2", "3"],
    "3": ["1", "2", "3"],
    "4": ["4", "5", "6"],
    "5": ["4", "5", "6"],
    "6": ["4", "5", "6"],
    "7": ["7"],
    "9": ["S"],
    "A": ["A", "C", "E"],
    "B": ["B", "D"],
    "D": ["B", "D", "F", "M"],
    "F": ["F", "M"],
    "G": ["G"],
    "H": ["A", "S"],
    "J": ["J", "Z"],
    "L": ["L"],
    "M": ["M"],
    "R": ["N", "Q", "R", "W"],
    "S": ["SIR"],
}


def _guess_lines(stop_id: str) -> list[str]:
    first = stop_id[0].upper() if stop_id else ""
    return _LINES_BY_PREFIX.get(first, [])


async def _load_subway_stations() -> list[dict]:
    global _subway_cache
    if _subway_cache is not None:
        return _subway_cache

    logger.info("Downloading GTFS static data for subway station lookup")
    async with httpx.AsyncClient() as client:
        resp = await client.get(GTFS_STATIC_URL, timeout=30, follow_redirects=True)
        resp.raise_for_status()

    stations: list[dict] = []
    seen: set[str] = set()

    with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
        with zf.open("stops.txt") as f:
            reader = csv.DictReader(io.TextIOWrapper(f, encoding="utf-8-sig"))
            for row in reader:
                # Only parent stations (location_type == "1")
                if row.get("location_type") != "1":
                    continue
                stop_id = row["stop_id"]
                if stop_id in seen:
                    continue
                seen.add(stop_id)
                stations.append(
                    {
                        "stop_id": stop_id,
                        "name": row["stop_name"],
                        "lines": _guess_lines(stop_id),
                    }
                )

    stations.sort(key=lambda s: s["name"])
    _subway_cache = stations
    logger.info("Loaded %d subway stations from GTFS", len(stations))
    return stations


async def search_subway(query: str) -> list[dict]:
    try:
        stations = await _load_subway_stations()
    except Exception:
        logger.exception("Failed to load subway station data")
        return []

    if not query:
        return stations[:50]

    q = query.lower()
    return [s for s in stations if q in s["name"].lower()][:25]


# ---------------------------------------------------------------------------
# Bus
# ---------------------------------------------------------------------------
_bus_cache: list[dict] | None = None
_BUS_STOPS_FILE = Path(__file__).parent.parent / "data" / "bus_stops.json"


def _load_bus_stops() -> list[dict]:
    """Load bus stops from pre-generated JSON file."""
    global _bus_cache
    if _bus_cache is not None:
        return _bus_cache

    if not _BUS_STOPS_FILE.exists():
        logger.warning("bus_stops.json not found at %s", _BUS_STOPS_FILE)
        return []

    import json

    _bus_cache = json.loads(_BUS_STOPS_FILE.read_text())
    logger.info("Loaded %d bus stops from %s", len(_bus_cache), _BUS_STOPS_FILE)
    return _bus_cache


async def search_bus(query: str) -> list[dict]:
    stops = _load_bus_stops()
    if not stops:
        return []

    if not query:
        return stops[:50]

    q = query.lower()
    return [s for s in stops if q in s["name"].lower() or q in " ".join(s.get("routes", [])).lower()][:25]


# ---------------------------------------------------------------------------
# Citibike
# ---------------------------------------------------------------------------
CITIBIKE_INFO_URL = (
    "https://gbfs.citibikenyc.com/gbfs/en/station_information.json"
)

_citibike_cache: list[dict] | None = None


async def _load_citibike_stations() -> list[dict]:
    global _citibike_cache
    if _citibike_cache is not None:
        return _citibike_cache

    logger.info("Fetching Citibike station info for lookup")
    async with httpx.AsyncClient() as client:
        resp = await client.get(CITIBIKE_INFO_URL, timeout=10)
        resp.raise_for_status()
        data = resp.json()

    stations: list[dict] = []
    for s in data.get("data", {}).get("stations", []):
        stations.append(
            {
                "station_id": s.get("short_name", s.get("station_id", "")),
                "name": s.get("name", ""),
            }
        )

    stations.sort(key=lambda s: s["name"])
    _citibike_cache = stations
    logger.info("Loaded %d Citibike stations", len(stations))
    return stations


async def search_citibike(query: str) -> list[dict]:
    try:
        stations = await _load_citibike_stations()
    except Exception:
        logger.exception("Failed to load Citibike station data")
        return []

    if not query:
        return stations[:50]

    q = query.lower()
    return [s for s in stations if q in s["name"].lower()][:25]
