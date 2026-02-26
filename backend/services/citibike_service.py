import logging
import time

import httpx

logger = logging.getLogger(__name__)

_cache: dict[str, tuple[dict, float]] = {}  # keyed by sorted station_ids
CACHE_SECONDS = 30

STATION_INFO_URL = "https://gbfs.citibikenyc.com/gbfs/en/station_information.json"
STATION_STATUS_URL = "https://gbfs.citibikenyc.com/gbfs/en/station_status.json"

# short_name -> {station_id, name, capacity} — loaded once
_station_lookup: dict[str, dict] | None = None


async def _load_station_info(client: httpx.AsyncClient) -> None:
    global _station_lookup
    if _station_lookup is not None:
        return
    resp = await client.get(STATION_INFO_URL, timeout=10.0)
    resp.raise_for_status()
    _station_lookup = {}
    for s in resp.json()["data"]["stations"]:
        short = s.get("short_name", "")
        if short:
            _station_lookup[short] = {
                "station_id": s["station_id"],
                "name": s["name"],
                "capacity": s["capacity"],
            }


async def get_citibike_status(station_ids: list[str]) -> dict:
    cache_key = ",".join(sorted(station_ids))
    now_mono = time.monotonic()

    cached = _cache.get(cache_key)
    if cached is not None and now_mono - cached[1] < CACHE_SECONDS:
        return cached[0]

    wanted = set(station_ids)

    async with httpx.AsyncClient() as client:
        await _load_station_info(client)

        resp = await client.get(STATION_STATUS_URL, timeout=10.0)
        resp.raise_for_status()
        statuses = resp.json()["data"]["stations"]

    # Build a reverse map: internal station_id -> short_name
    id_to_short: dict[str, str] = {}
    for short, info in (_station_lookup or {}).items():
        if short in wanted:
            id_to_short[info["station_id"]] = short

    stations = []
    for s in statuses:
        short = id_to_short.get(s["station_id"])
        if short is None:
            continue
        info = _station_lookup[short]  # type: ignore[index]

        total_bikes = s.get("num_bikes_available", 0)
        ebikes = s.get("num_ebikes_available", 0)
        classic = total_bikes - ebikes

        stations.append(
            {
                "station_name": info["name"],
                "short_name": short,
                "classic_bikes": classic,
                "ebikes": ebikes,
                "total_bikes": total_bikes,
                "docks_available": s.get("num_docks_available", 0),
                "capacity": info["capacity"],
                "is_active": bool(s.get("is_renting"))
                and bool(s.get("is_installed")),
            }
        )

    result = {
        "stations": stations,
        "updated_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }

    _cache[cache_key] = (result, now_mono)
    return result
