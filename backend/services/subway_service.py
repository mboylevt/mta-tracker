import asyncio
import datetime
import logging
import time

from nyct_gtfs import NYCTFeed

logger = logging.getLogger(__name__)

# Cache feeds by line key, each entry is (feed, last_refresh_monotonic)
_feeds: dict[str, tuple[NYCTFeed, float]] = {}
CACHE_SECONDS = 15

# Valid feed keys accepted by NYCTFeed
_VALID_FEED_KEYS = {
    "1", "2", "3", "4", "5", "6", "7", "S", "GS",
    "A", "C", "E", "H", "FS", "SF", "SR",
    "B", "D", "F", "M",
    "G",
    "J", "Z",
    "N", "Q", "R", "W",
    "L",
    "SI", "SIR",
}


# Map each valid feed key to a canonical representative so we don't
# fetch the same underlying feed URL multiple times.
_CANONICAL_FEED: dict[str, str] = {}
for _k in _VALID_FEED_KEYS:
    _url = NYCTFeed._train_to_url.get(_k, "")
    # Find the first key we've already mapped to this URL, or use this one.
    for _prev_k, _prev_url in list(_CANONICAL_FEED.items()):
        if NYCTFeed._train_to_url.get(_prev_k, "") == _url:
            _CANONICAL_FEED[_k] = _prev_k
            break
    else:
        _CANONICAL_FEED[_k] = _k


def _feeds_for_lines(lines: list[str]) -> set[str]:
    """Return the deduplicated set of canonical feed keys for the given lines."""
    if not lines:
        return {"1", "A", "B", "G", "J", "L", "N", "SI"}
    return {_CANONICAL_FEED[l] for l in lines if l in _CANONICAL_FEED}


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

    # Determine which feeds to query based on configured lines per stop,
    # and track which parent stop_ids each feed should look for.
    feed_to_parents: dict[str, set[str]] = {}
    for cfg in stop_configs:
        sid = cfg["stop_id"]
        feed_keys = _feeds_for_lines(cfg.get("lines", []))
        for key in feed_keys:
            feed_to_parents.setdefault(key, set()).add(sid)

    # Prepare result buckets
    results: dict[str, dict[str, list]] = {
        sid: {"northbound": [], "southbound": []} for sid in stop_ids
    }

    now = datetime.datetime.now()

    for line_key, parents in feed_to_parents.items():
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
