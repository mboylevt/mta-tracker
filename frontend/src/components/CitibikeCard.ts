import type { CitibikeResponse, CitibikeStation } from "../types";

function renderStation(station: CitibikeStation): string {
  if (!station.is_active) {
    return `
      <div class="direction-group">
        <h3 class="direction-label">${station.station_name}</h3>
        <p class="no-service">Station offline</p>
      </div>
    `;
  }

  return `
    <div class="direction-group">
      <h3 class="direction-label">${station.station_name}</h3>
      <div class="bike-counts">
        <div class="bike-stat">
          <span class="bike-count">${station.classic_bikes}</span>
          <span class="bike-label">Classic</span>
        </div>
        <div class="bike-stat">
          <span class="bike-count ebike-count">${station.ebikes}</span>
          <span class="bike-label">E-Bike</span>
        </div>
        <div class="bike-stat">
          <span class="bike-count dock-count">${station.docks_available}</span>
          <span class="bike-label">Docks</span>
        </div>
      </div>
    </div>
  `;
}

export function renderCitibikeCard(data: CitibikeResponse): void {
  const container = document.getElementById("citibike-content")!;

  if (data.stations.length === 0) {
    container.innerHTML = '<p class="no-service">No station data available</p>';
    return;
  }

  container.innerHTML = `<div class="citibike-grid">${data.stations.map(renderStation).join("")}</div>`;
}
