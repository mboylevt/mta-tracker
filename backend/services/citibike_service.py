import logging
import time

import httpx

from backend.config import settings

logger = logging.getLogger(__name__)

_cache: dict | None = None
_last_fetch: float = 0
CACHE_SECONDS = 30

STATION_INFO_URL = "https://gbfs.citibikenyc.com/gbfs/en/station_information.json"
STATION_STATUS_URL = "https://gbfs.citibikenyc.com/gbfs/en/station_status.json"

# Resolved at first fetch: short_name -> {station_id, name, capacity}
_station_lookup: dict[str, dict] | None = None


async def _load_station_info(client: httpx.AsyncClient) -> None:
    global _station_lookup
    if _station_lookup is not None:
        return
    resp = await client.get(STATION_INFO_URL, timeout=10.0)
    resp.raise_for_status()
    short_names = set(settings.citibike_station_ids.split(","))
    _station_lookup = {}
    for s in resp.json()["data"]["stations"]:
        if s.get("short_name") in short_names:
            _station_lookup[s["station_id"]] = {
                "short_name": s["short_name"],
                "name": s["name"],
                "capacity": s["capacity"],
            }


async def get_citibike_status() -> dict:
    global _cache, _last_fetch

    now_mono = time.monotonic()
    if _cache is not None and now_mono - _last_fetch < CACHE_SECONDS:
        return _cache

    async with httpx.AsyncClient() as client:
        await _load_station_info(client)

        resp = await client.get(STATION_STATUS_URL, timeout=10.0)
        resp.raise_for_status()
        statuses = resp.json()["data"]["stations"]

    stations = []
    for s in statuses:
        info = (_station_lookup or {}).get(s["station_id"])
        if info is None:
            continue

        total_bikes = s.get("num_bikes_available", 0)
        ebikes = s.get("num_ebikes_available", 0)
        classic = total_bikes - ebikes

        stations.append({
            "station_name": info["name"],
            "short_name": info["short_name"],
            "classic_bikes": classic,
            "ebikes": ebikes,
            "total_bikes": total_bikes,
            "docks_available": s.get("num_docks_available", 0),
            "capacity": info["capacity"],
            "is_active": bool(s.get("is_renting")) and bool(s.get("is_installed")),
        })

    result = {
        "stations": stations,
        "updated_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }

    _cache = result
    _last_fetch = now_mono
    return result
