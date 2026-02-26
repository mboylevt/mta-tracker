import type {
  AlertsResponse,
  SubwayResponse,
  BusResponse,
  CitibikeResponse,
  DashboardConfig,
  DashboardSummary,
  SubwayStationResult,
  BusStopResult,
  CitibikeStationResult,
} from "./types";

async function fetchJSON<T>(url: string): Promise<T> {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`${url}: ${resp.status} ${resp.statusText}`);
  }
  return resp.json() as Promise<T>;
}

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    throw new Error(`${url}: ${resp.status} ${resp.statusText}`);
  }
  return resp.json() as Promise<T>;
}

async function putJSON<T>(url: string, body: unknown): Promise<T> {
  const resp = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    throw new Error(`${url}: ${resp.status} ${resp.statusText}`);
  }
  return resp.json() as Promise<T>;
}

// --- Service alerts ---

export function fetchAlerts(
  subwayRoutes: string[],
  busRoutes: string[]
): Promise<AlertsResponse> {
  const params = new URLSearchParams();
  if (subwayRoutes.length) params.set("subway_routes", subwayRoutes.join(","));
  if (busRoutes.length) params.set("bus_routes", busRoutes.join(","));
  return fetchJSON<AlertsResponse>(`/api/alerts?${params.toString()}`);
}

// --- Data endpoints (parameterized) ---

export function fetchSubway(
  stops: { stop_id: string; lines: string[] }[]
): Promise<SubwayResponse> {
  const param = stops
    .map((s) =>
      s.lines.length ? `${s.stop_id}:${s.lines.join(",")}` : s.stop_id
    )
    .join(";");
  return fetchJSON<SubwayResponse>(`/api/subway?stops=${param}`);
}

export function fetchBus(stopIds: string[]): Promise<BusResponse> {
  return fetchJSON<BusResponse>(`/api/bus?stop_ids=${stopIds.join(",")}`);
}

export function fetchCitibike(stationIds: string[]): Promise<CitibikeResponse> {
  return fetchJSON<CitibikeResponse>(
    `/api/citibike?station_ids=${stationIds.join(",")}`
  );
}

// --- Dashboard CRUD ---

export function fetchDashboards(): Promise<DashboardSummary[]> {
  return fetchJSON<DashboardSummary[]>("/api/dashboards");
}

export function fetchDashboard(id: string): Promise<DashboardConfig> {
  return fetchJSON<DashboardConfig>(`/api/dashboards/${id}`);
}

export function createDashboard(
  config: DashboardConfig
): Promise<DashboardConfig> {
  return postJSON<DashboardConfig>("/api/dashboards", config);
}

export function updateDashboard(
  id: string,
  config: DashboardConfig
): Promise<DashboardConfig> {
  return putJSON<DashboardConfig>(`/api/dashboards/${id}`, config);
}

export async function deleteDashboard(id: string): Promise<void> {
  const resp = await fetch(`/api/dashboards/${id}`, { method: "DELETE" });
  if (!resp.ok) {
    throw new Error(`Delete failed: ${resp.status}`);
  }
}

// --- Station search ---

export function searchSubwayStations(
  q: string
): Promise<SubwayStationResult[]> {
  return fetchJSON<SubwayStationResult[]>(
    `/api/stations/subway?q=${encodeURIComponent(q)}`
  );
}

export function searchBusStops(q: string): Promise<BusStopResult[]> {
  return fetchJSON<BusStopResult[]>(
    `/api/stations/bus?q=${encodeURIComponent(q)}`
  );
}

export function searchCitibikeStations(
  q: string
): Promise<CitibikeStationResult[]> {
  return fetchJSON<CitibikeStationResult[]>(
    `/api/stations/citibike?q=${encodeURIComponent(q)}`
  );
}
