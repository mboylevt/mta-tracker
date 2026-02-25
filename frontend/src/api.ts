import type { SubwayResponse, BusResponse, CitibikeResponse, ConfigResponse } from "./types";

async function fetchJSON<T>(url: string): Promise<T> {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`${url}: ${resp.status} ${resp.statusText}`);
  }
  return resp.json() as Promise<T>;
}

export function fetchSubway(): Promise<SubwayResponse> {
  return fetchJSON<SubwayResponse>("/api/subway");
}

export function fetchBus(): Promise<BusResponse> {
  return fetchJSON<BusResponse>("/api/bus");
}

export function fetchCitibike(): Promise<CitibikeResponse> {
  return fetchJSON<CitibikeResponse>("/api/citibike");
}

export function fetchConfig(): Promise<ConfigResponse> {
  return fetchJSON<ConfigResponse>("/api/config");
}
