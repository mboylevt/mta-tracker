import datetime
import logging
import time

import httpx
from nyct_gtfs.compiled_gtfs import gtfs_realtime_pb2

logger = logging.getLogger(__name__)

SUBWAY_ALERTS_URL = (
    "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/"
    "camsys%2Fsubway-alerts"
)
BUS_ALERTS_URL = (
    "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/"
    "camsys%2Fbus-alerts"
)

_cache: dict[str, tuple[list[dict], float]] = {}
CACHE_SECONDS = 60


def _extract_text(translated_string) -> str:
    """Pull English text from a GTFS-RT TranslatedString."""
    if not translated_string or not translated_string.translation:
        return ""
    for t in translated_string.translation:
        if t.language in ("en", "EN", "en-US", ""):
            return t.text
    return translated_string.translation[0].text


_EFFECT_LABELS = {
    gtfs_realtime_pb2.Alert.NO_SERVICE: "No Service",
    gtfs_realtime_pb2.Alert.REDUCED_SERVICE: "Reduced Service",
    gtfs_realtime_pb2.Alert.SIGNIFICANT_DELAYS: "Delays",
    gtfs_realtime_pb2.Alert.DETOUR: "Detour",
    gtfs_realtime_pb2.Alert.ADDITIONAL_SERVICE: "Additional Service",
    gtfs_realtime_pb2.Alert.MODIFIED_SERVICE: "Modified Service",
    gtfs_realtime_pb2.Alert.STOP_MOVED: "Stop Moved",
    gtfs_realtime_pb2.Alert.OTHER_EFFECT: "Service Change",
    gtfs_realtime_pb2.Alert.UNKNOWN_EFFECT: "Service Alert",
}


def _parse_feed(data: bytes, alert_type: str) -> list[dict]:
    """Parse a GTFS-RT alerts feed into a list of alert dicts."""
    feed = gtfs_realtime_pb2.FeedMessage()
    feed.ParseFromString(data)

    now_ts = datetime.datetime.now(tz=datetime.timezone.utc).timestamp()
    alerts = []

    for entity in feed.entity:
        if not entity.HasField("alert"):
            continue
        alert = entity.alert

        # Check if alert is currently active
        if alert.active_period:
            active_now = False
            for period in alert.active_period:
                start = period.start if period.start else 0
                end = period.end if period.end else float("inf")
                if start <= now_ts <= end:
                    active_now = True
                    break
            if not active_now:
                continue

        # Collect affected route_ids
        route_ids = set()
        for ie in alert.informed_entity:
            if ie.route_id:
                # Bus routes may be prefixed like "MTA NYCT_Q69" or
                # "MTABC_Q100" — extract the short name.
                rid = ie.route_id
                if "_" in rid:
                    rid = rid.rsplit("_", 1)[-1]
                route_ids.add(rid)

        if not route_ids:
            continue

        header = _extract_text(alert.header_text)
        description = _extract_text(alert.description_text)

        if not header:
            continue

        effect = _EFFECT_LABELS.get(alert.effect, "Service Alert")

        alerts.append(
            {
                "alert_id": entity.id,
                "header": header,
                "description": description,
                "affected_routes": sorted(route_ids),
                "effect": effect,
                "alert_type": alert_type,
            }
        )

    return alerts


async def _fetch_feed(url: str, cache_key: str, alert_type: str) -> list[dict]:
    now_mono = time.monotonic()
    cached = _cache.get(cache_key)
    if cached is not None and now_mono - cached[1] < CACHE_SECONDS:
        return cached[0]

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=10.0)
            resp.raise_for_status()
    except Exception:
        logger.exception("Failed to fetch alerts from %s", url)
        # Return stale cache if available, else empty
        if cached is not None:
            return cached[0]
        return []

    alerts = _parse_feed(resp.content, alert_type)
    _cache[cache_key] = (alerts, now_mono)
    return alerts


async def get_alerts(
    subway_routes: list[str] | None = None,
    bus_routes: list[str] | None = None,
) -> dict:
    """Fetch service alerts filtered to the given routes.

    Returns only alerts whose affected_routes overlap with the requested ones.
    """
    requested_subway = set(subway_routes) if subway_routes else set()
    requested_bus = set(bus_routes) if bus_routes else set()

    filtered: list[dict] = []

    if requested_subway:
        all_subway = await _fetch_feed(SUBWAY_ALERTS_URL, "subway", "subway")
        for a in all_subway:
            matching = sorted(requested_subway & set(a["affected_routes"]))
            if matching:
                filtered.append({**a, "affected_routes": matching})

    if requested_bus:
        all_bus = await _fetch_feed(BUS_ALERTS_URL, "bus", "bus")
        for a in all_bus:
            matching = sorted(requested_bus & set(a["affected_routes"]))
            if matching:
                filtered.append({**a, "affected_routes": matching})

    return {
        "alerts": filtered,
        "updated_at": datetime.datetime.now(
            tz=datetime.timezone.utc
        ).isoformat(),
    }
