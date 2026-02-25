# MTA Transit Tracker - Implementation Plan

## Context

Build a Dockerized single-page web app to display real-time NYC MTA subway and bus arrival times for stations near the user's home in Astoria. The app will run on an Unraid server and help the user decide which bus or train to take based on live departure data. The project is greenfield — no code exists yet.

## Architecture Overview

- **Backend**: Python 3.11+ / FastAPI serving a REST API + static frontend files
- **Frontend**: Vanilla TypeScript + Vite (no React — the UI is just two cards, a framework would be overkill)
- **Deployment**: Single Docker container via multi-stage build (Node for frontend compilation, Python for runtime)
- **Data sources**:
  - Subway: MTA GTFS-Realtime feed via `nyct-gtfs` library (no API key needed)
  - Bus: MTA Bus Time SIRI API via `httpx` (free API key required)

## Project Structure

```
mtaTracker/
├── Dockerfile                    # Multi-stage: Node build + Python runtime
├── docker-compose.yml
├── .env.example
├── .gitignore
├── backend/
│   ├── requirements.txt          # fastapi, uvicorn, nyct-gtfs, httpx, pydantic-settings
│   ├── main.py                   # FastAPI app, mounts routers + static files
│   ├── config.py                 # Pydantic BaseSettings (env vars)
│   ├── routers/
│   │   ├── subway.py             # GET /api/subway
│   │   └── bus.py                # GET /api/bus
│   ├── services/
│   │   ├── subway_service.py     # nyct-gtfs wrapper with 15s feed cache
│   │   └── bus_service.py        # SIRI StopMonitoring client with 30s cache
│   └── models/
│       └── arrivals.py           # Pydantic response models
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── main.ts               # Bootstrap + 30s auto-refresh loop
        ├── api.ts                 # Fetch wrappers for /api/subway, /api/bus
        ├── types.ts              # TypeScript interfaces matching API models
        ├── components/
        │   ├── SubwayCard.ts     # N/W train arrivals, grouped by direction
        │   ├── BusCard.ts        # Bus arrivals list
        │   ├── CountdownTimer.ts # Client-side 1s countdown tick
        │   └── StatusBanner.ts   # Error/loading/stale-data states
        └── styles/
            └── main.css          # MTA-branded: blue (#0039A6), yellow (#FCCC0A), Helvetica
```

## API Design

### `GET /api/subway`
Returns N/W train arrivals at Ditmars Blvd, split by direction:
- `manhattan_bound[]` — southbound trains (R01S), what the user will ride
- `ditmars_bound[]` — northbound trains (R01N), arriving at terminal
- Each arrival: `{ line, direction, arrival_time, minutes_until_arrival, headsign, is_delayed }`

### `GET /api/bus`
Returns upcoming bus arrivals at the configured stop(s):
- `arrivals[]` — sorted by arrival time
- Each arrival: `{ route, direction, minutes_until_arrival, distance_text, stop_name }`

### `GET /api/config`
Returns non-sensitive config for the frontend (refresh interval, station names, line letters).

## Key Implementation Details

### Subway Service (`backend/services/subway_service.py`)
- Uses `nyct-gtfs` library (handles GTFS-Realtime protobuf parsing)
- Feed URL: `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct/gtfs-nqrw`
- Caches the feed object, calls `.refresh()` only when >15s stale
- **Terminal station edge case**: Ditmars Blvd is the N/W terminal. Must iterate all N/W trips and check `stop_time_updates` for R01N/R01S rather than using `headed_for_stop_id` which may not work for terminal stops
- **Blocking calls**: `nyct-gtfs` is synchronous — wrap in `asyncio.to_thread()` to avoid blocking FastAPI's event loop
- **Late night**: N doesn't run late night, W doesn't run late night at all — show "No trains scheduled" gracefully

### Bus Service (`backend/services/bus_service.py`)
- Direct HTTP calls to `https://bustime.mta.info/api/siri/stop-monitoring.json`
- Requires `MTA_BUS_API_KEY` env var
- 30-second in-memory cache to respect MTA rate limits
- Bus stop IDs configured via env var (discovered once using `stops-for-location` API or GTFS static data)

### Frontend Auto-Refresh
- Polls backend every 30 seconds via `setInterval`
- Client-side countdown timer ticks every 1 second between polls (computed from `arrival_time`)
- Uses `Promise.allSettled` so subway/bus failures are independent
- Shows yellow "stale data" banner on fetch failure, keeps displaying last known data

### Configuration (all via env vars, no hardcoded addresses)
- `MTA_BUS_API_KEY` — required (user already has one)
- `SUBWAY_STOP_IDS` — defaults to `R01N,R01S` (Ditmars Blvd)
- `BUS_STOP_IDS` — to be discovered during implementation
- `REFRESH_INTERVAL_SECONDS` — defaults to `30`

### Confirmed Decisions
- **Frontend**: Vanilla TypeScript + Vite (no React)
- **Directions**: Show both Manhattan-bound and Ditmars-bound arrivals
- **Bus API key**: User already has one, no registration step needed

### MTA Branding
- Colors: MTA Blue `#0039A6`, N/W Yellow `#FCCC0A`
- Typography: Helvetica Neue
- Subway line bullets rendered as CSS circles (matching MTA style, no trademarked assets)
- Card-based layout mimicking MTA signage aesthetic

## Implementation Order

1. **Backend skeleton** — project structure, config, FastAPI app with health endpoint, Pydantic models
2. **Subway service** — `nyct-gtfs` integration, `/api/subway` endpoint, test with real data
3. **Bus service** — SIRI API integration, `/api/bus` endpoint, caching layer
4. **Frontend** — Vite scaffold, TypeScript components, MTA styling, auto-refresh
5. **Docker** — Multi-stage Dockerfile, docker-compose.yml, .env.example
6. **Polish** — Error handling, logging, .gitignore, edge cases (no service, API down)

## Verification

1. Run backend locally: `uvicorn backend.main:app --reload` — hit `/api/subway` and `/api/bus` in browser, verify real arrival data
2. Run frontend dev server: `cd frontend && npm run dev` — verify cards render with live data
3. Docker build: `docker-compose up --build` — verify app works at `http://localhost:8080`
4. Edge cases: test late at night (no trains), disconnect network (error banners), rapid refresh (caching works)
