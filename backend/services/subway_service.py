import asyncio
import datetime
import logging
import time

from nyct_gtfs import NYCTFeed

from backend.config import settings

logger = logging.getLogger(__name__)

_feed: NYCTFeed | None = None
_last_refresh: float = 0
CACHE_SECONDS = 15


def _get_feed() -> NYCTFeed:
    """Get or create the feed, refreshing if stale. Must be called from a thread."""
    global _feed, _last_refresh

    now = time.monotonic()
    if _feed is None:
        logger.info("Creating new NQRW feed")
        _feed = NYCTFeed("N")
        _last_refresh = now
    elif now - _last_refresh > CACHE_SECONDS:
        logger.info("Refreshing NQRW feed")
        _feed.refresh()
        _last_refresh = now

    return _feed


def _build_arrivals(feed: NYCTFeed) -> dict:
    """Extract N/W arrivals at Ditmars Blvd from the feed."""
    stop_ids = [s.strip() for s in settings.subway_stop_ids.split(",")]
    now = datetime.datetime.now()

    manhattan_bound = []
    ditmars_bound = []

    trips = feed.filter_trips(line_id=["N", "W"])

    for trip in trips:
        for stop in trip.stop_time_updates:
            if stop.stop_id not in stop_ids:
                continue

            arrival_dt = stop.arrival
            if arrival_dt is None:
                continue

            minutes = (arrival_dt - now).total_seconds() / 60
            if minutes < -1:
                continue

            entry = {
                "line": trip.route_id,
                "direction": "Manhattan" if stop.stop_id.endswith("S") else "Ditmars Blvd",
                "arrival_time": arrival_dt.isoformat(),
                "minutes_until_arrival": round(max(minutes, 0), 1),
                "headsign": getattr(trip, "headsign_text", "") or "",
                "is_delayed": bool(getattr(trip, "has_delay_alert", False)),
            }

            if stop.stop_id.endswith("S"):
                manhattan_bound.append(entry)
            else:
                ditmars_bound.append(entry)

    manhattan_bound.sort(key=lambda x: x["minutes_until_arrival"])
    ditmars_bound.sort(key=lambda x: x["minutes_until_arrival"])

    return {
        "station_name": "Astoria - Ditmars Blvd",
        "manhattan_bound": manhattan_bound,
        "ditmars_bound": ditmars_bound,
        "updated_at": now.isoformat(),
    }


async def get_subway_arrivals() -> dict:
    """Async wrapper — runs blocking nyct-gtfs code in a thread."""
    feed = await asyncio.to_thread(_get_feed)
    return await asyncio.to_thread(_build_arrivals, feed)
