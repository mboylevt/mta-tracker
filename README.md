# MTA Transit Tracker

A real-time transit dashboard showing NYC subway and bus arrivals, designed to run in a Docker container on an Unraid server.

Displays live N/W train arrivals at **Astoria - Ditmars Blvd** and bus arrivals at **24 Av / 21 St**, with client-side countdown timers and automatic data refresh.

## How It Works

The app has two layers:

**Backend (Python/FastAPI)** polls the MTA's real-time data feeds and exposes them as clean JSON endpoints:

- **Subway**: Uses the [`nyct-gtfs`](https://github.com/Andrew-Dickinson/nyct-gtfs) library to parse the MTA's GTFS-Realtime protobuf feed for N/Q/R/W trains. The feed is cached for 15 seconds and parsed in a background thread to avoid blocking the async event loop. No API key required.
- **Bus**: Calls the MTA Bus Time [SIRI StopMonitoring API](https://bustime.mta.info/wiki/Developers/SIRIStopMonitoring) over HTTP. Responses are cached for 30 seconds to respect rate limits. Requires a free API key.

**Frontend (TypeScript/Vite)** is a single-page app that fetches from the backend every 30 seconds. Between polls, a client-side countdown timer ticks every second so arrival times stay accurate. Subway and bus fetches are independent — if one fails, the other still updates, and a yellow banner indicates stale data.

In production (Docker), FastAPI serves the compiled frontend as static files. In development, Vite's dev server proxies `/api` requests to the backend.

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/subway` | N/W arrivals at Ditmars Blvd, split into `manhattan_bound` and `ditmars_bound` arrays |
| `GET /api/bus` | Bus arrivals at configured stop(s), sorted by arrival time |
| `GET /api/config` | Non-sensitive config: refresh interval, station names, line letters |
| `GET /api/health` | Health check (`{"status": "ok"}`) |

## Prerequisites

- **Python 3.11+** and **Node.js 20+** (for local development)
- **Docker** and **Docker Compose** (for containerized deployment)
- **MTA Bus Time API key** — free, register at https://bustime.mta.info/wiki/Developers/Index

## Setup

### 1. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and add your MTA Bus Time API key:

```
MTA_BUS_API_KEY=your_key_here
```

### 2a. Run with Docker (recommended)

```bash
docker-compose up --build
```

The app will be available at **http://localhost:9876**.

### 2b. Run locally for development

In one terminal, start the backend:

```bash
pip install -r backend/requirements.txt
uvicorn backend.main:app --port 9876 --reload
```

In another terminal, start the frontend dev server:

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server (typically http://localhost:9876) proxies API calls to the backend on port 9876.

## Configuration

All configuration is via environment variables (set in `.env` or passed to Docker):

| Variable | Required | Default | Description |
|---|---|---|---|
| `MTA_BUS_API_KEY` | Yes (for bus data) | — | MTA Bus Time API key |
| `SUBWAY_STOP_IDS` | No | `R01N,R01S` | GTFS stop IDs for subway station (Ditmars Blvd) |
| `BUS_STOP_IDS` | No | `308209` | MTA bus stop ID(s), comma-separated |
| `REFRESH_INTERVAL_SECONDS` | No | `30` | How often the frontend polls for new data |

GFS Stop IDs for subway stations can be found from the MTA [here](https://catalog.data.gov/dataset/mta-subway-stations-and-complexes)
Bus Station IDs can be found [here](https://data.ny.gov/Transportation/MTA-Bus-Stops/2ucp-7wg5/about_data)
## Dependencies

### Backend (Python)

| Package | Purpose |
|---|---|
| [FastAPI](https://fastapi.tiangolo.com/) | Web framework and API routing |
| [Uvicorn](https://www.uvicorn.org/) | ASGI server |
| [nyct-gtfs](https://github.com/Andrew-Dickinson/nyct-gtfs) | Parses MTA GTFS-Realtime protobuf feeds for subway data |
| [httpx](https://www.python-httpx.org/) | Async HTTP client for MTA Bus Time SIRI API |
| [pydantic-settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) | Environment variable configuration |

### Frontend (TypeScript)

| Package | Purpose |
|---|---|
| [Vite](https://vite.dev/) | Build tool and dev server |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe JavaScript |

No runtime JS dependencies — the frontend is vanilla TypeScript with no framework.

## Project Structure

```
mtaTracker/
├── Dockerfile                # Multi-stage: Node build → Python runtime
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── main.py               # FastAPI app, mounts routers + static files
│   ├── config.py             # Pydantic BaseSettings (reads env vars)
│   ├── routers/
│   │   ├── subway.py         # GET /api/subway
│   │   └── bus.py            # GET /api/bus
│   ├── services/
│   │   ├── subway_service.py # nyct-gtfs wrapper, 15s cache, threaded
│   │   └── bus_service.py    # SIRI API client, 30s cache
│   └── models/
│       └── arrivals.py       # Pydantic response schemas
└── frontend/
    ├── index.html
    ├── vite.config.ts
    └── src/
        ├── main.ts           # App bootstrap, 30s auto-refresh
        ├── api.ts            # Typed fetch wrappers
        ├── types.ts          # TypeScript interfaces matching API models
        ├── components/
        │   ├── SubwayCard.ts     # Renders N/W arrivals by direction
        │   ├── BusCard.ts        # Renders bus arrivals list
        │   ├── CountdownTimer.ts # 1-second client-side countdown
        │   └── StatusBanner.ts   # Error/stale/loading banners
        └── styles/
            └── main.css      # MTA-branded: blue, yellow, Helvetica
```

## Docker Deployment on Unraid

1. Copy the project to your Unraid server
2. Create a `.env` file with your `MTA_BUS_API_KEY`
3. Run `docker-compose up -d --build`
4. Access at `http://<unraid-ip>:8080`

To change the host port, edit `docker-compose.yml`:

```yaml
ports:
  - "3000:8080"  # change 3000 to your preferred port
```

## Design

The UI follows MTA's visual language:

- **MTA Blue** (`#0039A6`) header and accents
- **N/W Yellow** (`#FCCC0A`) line indicator circles
- **Helvetica Neue** typography
- Card-based layout with arrivals grouped by direction
- Pulsing green badge for trains arriving now
- Yellow banner for stale/cached data on connection issues
