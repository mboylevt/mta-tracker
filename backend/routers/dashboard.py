import logging

from fastapi import APIRouter, HTTPException

from backend.models.dashboard import DashboardConfig, DashboardSummary
from backend.services.dashboard_service import (
    delete_dashboard,
    get_dashboard,
    list_dashboards,
    save_dashboard,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/dashboards")


@router.get("", response_model=list[DashboardSummary])
async def list_all():
    return list_dashboards()


@router.get("/{dashboard_id}", response_model=DashboardConfig)
async def get_one(dashboard_id: str):
    config = get_dashboard(dashboard_id)
    if config is None:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    return config


@router.post("", response_model=DashboardConfig, status_code=201)
async def create(config: DashboardConfig):
    return save_dashboard(config)


@router.put("/{dashboard_id}", response_model=DashboardConfig)
async def update(dashboard_id: str, config: DashboardConfig):
    config.id = dashboard_id
    return save_dashboard(config)


@router.delete("/{dashboard_id}", status_code=204)
async def delete(dashboard_id: str):
    if not delete_dashboard(dashboard_id):
        raise HTTPException(status_code=404, detail="Dashboard not found")
