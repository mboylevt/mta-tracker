// --- Arrival data ---

export interface SubwayArrival {
  line: string;
  direction: string;
  arrival_time: string;
  minutes_until_arrival: number;
  headsign: string;
  is_delayed: boolean;
}

export interface SubwayStationData {
  stop_id: string;
  station_name: string;
  northbound: SubwayArrival[];
  southbound: SubwayArrival[];
}

export interface SubwayResponse {
  stations: SubwayStationData[];
  updated_at: string;
  error?: string;
}

export interface BusArrival {
  route: string;
  direction: string;
  minutes_until_arrival: number;
  distance_text: string;
  stop_name: string;
}

export interface BusResponse {
  arrivals: BusArrival[];
  updated_at: string;
  error?: string;
}

export interface CitibikeStation {
  station_name: string;
  short_name: string;
  classic_bikes: number;
  ebikes: number;
  total_bikes: number;
  docks_available: number;
  capacity: number;
  is_active: boolean;
}

export interface CitibikeResponse {
  stations: CitibikeStation[];
  updated_at: string;
}

// --- Dashboard config ---

export interface SubwayStopConfig {
  stop_id: string;
  name: string;
  lines: string[];
}

export interface BusStopConfig {
  stop_id: string;
  name: string;
  routes: string[];
}

export interface CitibikeStationConfig {
  station_id: string;
  name: string;
}

export interface DashboardConfig {
  id: string;
  name: string;
  subway_stops: SubwayStopConfig[];
  bus_stops: BusStopConfig[];
  citibike_stations: CitibikeStationConfig[];
}

export interface DashboardSummary {
  id: string;
  name: string;
  subway_stop_count: number;
  bus_stop_count: number;
  citibike_station_count: number;
}

// --- Station search results ---

export interface SubwayStationResult {
  stop_id: string;
  name: string;
  lines: string[];
}

export interface BusStopResult {
  stop_id: string;
  name: string;
  routes: string[];
}

export interface CitibikeStationResult {
  station_id: string;
  name: string;
}
