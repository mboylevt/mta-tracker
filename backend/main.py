import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from backend.config import settings
from backend.models.arrivals import ConfigResponse
from backend.routers import bus, citibike, subway

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(title="MTA Transit Tracker")

app.include_router(subway.router, prefix="/api")
app.include_router(bus.router, prefix="/api")
app.include_router(citibike.router, prefix="/api")


@app.get("/api/config", response_model=ConfigResponse)
async def get_config():
    return ConfigResponse(
        refresh_interval_seconds=settings.refresh_interval_seconds,
        station_name="Astoria - Ditmars Blvd",
        subway_lines=["N", "W"],
        bus_stop_name="24 Av / 21 St",
    )


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# Serve frontend static files (built assets go into /app/static in Docker)
static_dir = Path(__file__).parent.parent / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
