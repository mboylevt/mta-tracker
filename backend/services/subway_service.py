import asyncio
import datetime
import logging
import time

from nyct_gtfs import NYCTFeed

logger = logging.getLogger(__name__)

# Cache feeds by line key, each entry is (feed, last_refresh_monotonic)
_feeds: dict[str, tuple[NYCTFeed, float]] = {}
CACHE_SECONDS = 15

# Map stop_id first character to a representative line letter for NYCTFeed
_STOP_PREFIX_TO_LINE: dict[str, str] = {
    "A": "A", "H": "A",
    "B": "B", "D": "D", "F": "F", "M": "M",
    "G": "G",
    "J": "J",
    "L": "L",
    "R": "N",
    "S": "SI",
}


def _line_for_stop(stop_id: str) -> str:
    base = stop_id.rstrip("NS")
    if not base:
        return "1"
    first = base[0].upper()
    if first.isdigit():
        return "1"
    return _STOP_PREFIX_TO_LINE.get(first, "1")


def _get_feed(line_key: str) -> NYCTFeed:
    now = time.monotonic()
    if line_key in _feeds:
        feed, last = _feeds[line_key]
        if now - last <= CACHE_SECONDS:
            return feed
        feed.refresh()
        _feeds[line_key] = (feed, now)
        return feed

    logger.info("Creating NYCTFeed for line key %s", line_key)
    feed = NYCTFeed(line_key)
    _feeds[line_key] = (feed, now)
    return feed


def _build_arrivals_sync(stop_configs: list[dict]) -> dict:
    """
    stop_configs: list of {"stop_id": "R01", "lines": ["N", "W"]}.
    Empty lines list means show all lines.
    Returns a SubwayResponse-compatible dict.
    """
    # Build lookup: parent stop_id -> set of allowed lines (empty = all)
    line_filters: dict[str, set[str]] = {}
    stop_ids = []
    for cfg in stop_configs:
        sid = cfg["stop_id"]
        stop_ids.append(sid)
        lines = cfg.get("lines", [])
        line_filters[sid] = set(lines) if lines else set()

    # Group parent stop IDs by the feed line they belong to
    line_to_parents: dict[str, set[str]] = {}
    for sid in stop_ids:
        line = _line_for_stop(sid)
        line_to_parents.setdefault(line, set()).add(sid)

    # Prepare result buckets
    results: dict[str, dict[str, list]] = {
        sid: {"northbound": [], "southbound": []} for sid in stop_ids
    }

    now = datetime.datetime.now()

    for line_key, parents in line_to_parents.items():
        try:
            feed = _get_feed(line_key)
        except Exception:
            logger.exception("Failed to fetch feed for line key %s", line_key)
            continue

        for trip in feed.trips:
            route = trip.route_id  # e.g. "N", "W", "A"

            for stop in trip.stop_time_updates:
                full_id = stop.stop_id  # e.g. "R01N"
                if not full_id:
                    continue
                suffix = full_id[-1]
                parent = full_id[:-1] if suffix in ("N", "S") else full_id

                if parent not in parents:
                    continue

                # Apply line filter
                allowed = line_filters.get(parent, set())
                if allowed and route not in allowed:
                    continue

                arrival_dt = stop.arrival
                if arrival_dt is None:
                    continue

                minutes = (arrival_dt - now).total_seconds() / 60
                if minutes < -1:
                    continue

                entry = {
                    "line": route,
                    "direction": "Uptown" if suffix == "N" else "Downtown",
                    "arrival_time": arrival_dt.isoformat(),
                    "minutes_until_arrival": round(max(minutes, 0), 1),
                    "headsign": getattr(trip, "headsign_text", "") or "",
                    "is_delayed": bool(
                        getattr(trip, "has_delay_alert", False)
                    ),
                }

                bucket = "northbound" if suffix == "N" else "southbound"
                results[parent][bucket].append(entry)

    # Sort each direction
    for sid in results:
        for d in ("northbound", "southbound"):
            results[sid][d].sort(key=lambda x: x["minutes_until_arrival"])

    stations = [
        {
            "stop_id": sid,
            "station_name": "",
            "northbound": results[sid]["northbound"],
            "southbound": results[sid]["southbound"],
        }
        for sid in stop_ids
    ]

    return {"stations": stations, "updated_at": now.isoformat()}


async def get_subway_arrivals(stop_configs: list[dict]) -> dict:
    """Async wrapper - runs blocking nyct-gtfs code in a thread."""
    return await asyncio.to_thread(_build_arrivals_sync, stop_configs)
