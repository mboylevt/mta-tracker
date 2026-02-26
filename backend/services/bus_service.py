import datetime
import logging
import time

import httpx

from backend.config import settings

logger = logging.getLogger(__name__)

_cache: dict[str, tuple[dict, float]] = {}  # keyed by sorted stop_ids string
CACHE_SECONDS = 30

SIRI_BASE = "https://bustime.mta.info/api/siri/stop-monitoring.json"


async def _fetch_stop(client: httpx.AsyncClient, stop_id: str) -> list[dict]:
    params = {
        "key": settings.mta_bus_api_key,
        "OperatorRef": "MTA",
        "MonitoringRef": stop_id,
        "MaximumStopVisits": 10,
    }

    resp = await client.get(SIRI_BASE, params=params, timeout=10.0)
    resp.raise_for_status()
    data = resp.json()

    deliveries = (
        data.get("Siri", {})
        .get("ServiceDelivery", {})
        .get("StopMonitoringDelivery", [])
    )

    arrivals = []
    now = datetime.datetime.now(tz=datetime.timezone.utc)

    for delivery in deliveries:
        visits = delivery.get("MonitoredStopVisit", [])
        for visit in visits:
            journey = visit.get("MonitoredVehicleJourney", {})
            call = journey.get("MonitoredCall", {})

            arrival_str = call.get("ExpectedArrivalTime") or call.get(
                "AimedArrivalTime"
            )
            if not arrival_str:
                continue

            arrival_dt = datetime.datetime.fromisoformat(arrival_str)
            minutes = (arrival_dt - now).total_seconds() / 60
            if minutes < -1:
                continue

            distances = call.get("Extensions", {}).get("Distances", {})
            distance_text = distances.get(
                "PresentableDistance", "approaching"
            )

            arrivals.append(
                {
                    "route": (
                        journey.get("PublishedLineName", [""])[0]
                        if isinstance(journey.get("PublishedLineName"), list)
                        else journey.get("PublishedLineName", "")
                    ),
                    "direction": (
                        journey.get("DestinationName", [""])[0]
                        if isinstance(journey.get("DestinationName"), list)
                        else journey.get("DestinationName", "")
                    ),
                    "minutes_until_arrival": round(max(minutes, 0), 1),
                    "distance_text": distance_text,
                    "stop_name": (
                        call.get("StopPointName", [""])[0]
                        if isinstance(call.get("StopPointName"), list)
                        else call.get("StopPointName", stop_id)
                    ),
                }
            )

    return arrivals


async def get_bus_arrivals(stop_ids: list[str]) -> dict:
    cache_key = ",".join(sorted(stop_ids))
    now_mono = time.monotonic()

    cached = _cache.get(cache_key)
    if cached is not None and now_mono - cached[1] < CACHE_SECONDS:
        return cached[0]

    if not settings.mta_bus_api_key:
        return {
            "arrivals": [],
            "updated_at": datetime.datetime.now(
                tz=datetime.timezone.utc
            ).isoformat(),
            "error": "MTA_BUS_API_KEY not configured",
        }

    all_arrivals: list[dict] = []

    async with httpx.AsyncClient() as client:
        for stop_id in stop_ids:
            try:
                arrivals = await _fetch_stop(client, stop_id)
                all_arrivals.extend(arrivals)
            except Exception:
                logger.exception(
                    "Failed to fetch bus arrivals for stop %s", stop_id
                )

    all_arrivals.sort(key=lambda x: x["minutes_until_arrival"])

    result = {
        "arrivals": all_arrivals,
        "updated_at": datetime.datetime.now(
            tz=datetime.timezone.utc
        ).isoformat(),
    }

    _cache[cache_key] = (result, now_mono)
    return result
