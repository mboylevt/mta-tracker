export interface SubwayArrival {
  line: string;
  direction: string;
  arrival_time: string;
  minutes_until_arrival: number;
  headsign: string;
  is_delayed: boolean;
}

export interface SubwayResponse {
  station_name: string;
  manhattan_bound: SubwayArrival[];
  ditmars_bound: SubwayArrival[];
  updated_at: string;
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

export interface ConfigResponse {
  refresh_interval_seconds: number;
  station_name: string;
  subway_lines: string[];
  bus_stop_name: string;
}
