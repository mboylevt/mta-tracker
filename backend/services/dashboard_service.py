import json
import logging
from pathlib import Path

from backend.config import settings
from backend.models.dashboard import DashboardConfig, DashboardSummary

logger = logging.getLogger(__name__)


def _data_dir() -> Path:
    d = Path(settings.data_dir)
    d.mkdir(parents=True, exist_ok=True)
    return d


def list_dashboards() -> list[DashboardSummary]:
    results = []
    for f in sorted(_data_dir().glob("*.json")):
        try:
            config = DashboardConfig.model_validate_json(f.read_text())
            results.append(
                DashboardSummary(
                    id=config.id,
                    name=config.name,
                    subway_stop_count=len(config.subway_stops),
                    bus_stop_count=len(config.bus_stops),
                    citibike_station_count=len(config.citibike_stations),
                )
            )
        except Exception:
            logger.warning("Skipping invalid config file: %s", f.name)
    return results


def get_dashboard(dashboard_id: str) -> DashboardConfig | None:
    path = _data_dir() / f"{dashboard_id}.json"
    if not path.exists():
        return None
    return DashboardConfig.model_validate_json(path.read_text())


def save_dashboard(config: DashboardConfig) -> DashboardConfig:
    import uuid

    if not config.id:
        config.id = uuid.uuid4().hex[:8]
    path = _data_dir() / f"{config.id}.json"
    path.write_text(config.model_dump_json(indent=2))
    return config


def delete_dashboard(dashboard_id: str) -> bool:
    path = _data_dir() / f"{dashboard_id}.json"
    if path.exists():
        path.unlink()
        return True
    return False
