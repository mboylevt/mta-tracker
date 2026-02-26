import type { SubwayArrival, SubwayResponse, SubwayStationData } from "../types";
import { registerCountdown } from "./CountdownTimer";

const MAX_ARRIVALS = 5;

function renderArrivalRow(
  arrival: SubwayArrival,
  index: number,
  idPrefix: string,
  dirLabel: string
): string {
  const lineClass = arrival.line.toLowerCase();
  const delayBadge = arrival.is_delayed
    ? '<span class="delay-badge">DELAYED</span>'
    : "";

  return `
    <tr class="arrival-row">
      <td><span class="line-bullet line-${lineClass}">${arrival.line}</span></td>
      <td class="headsign">${arrival.headsign || dirLabel} ${delayBadge}</td>
      <td class="countdown" id="${idPrefix}-${index}" data-arrival="${arrival.arrival_time}"></td>
    </tr>
  `;
}

function renderDirection(
  label: string,
  arrivals: SubwayArrival[],
  idPrefix: string
): string {
  if (arrivals.length === 0) {
    return `
      <div class="direction-group">
        <h3 class="direction-label">${label}</h3>
        <p class="no-service">No trains scheduled</p>
      </div>
    `;
  }

  const rows = arrivals
    .slice(0, MAX_ARRIVALS)
    .map((a, i) => renderArrivalRow(a, i, idPrefix, label))
    .join("");

  return `
    <div class="direction-group">
      <h3 class="direction-label">${label}</h3>
      <table class="arrivals-table"><tbody>${rows}</tbody></table>
    </div>
  `;
}

function renderStation(station: SubwayStationData, stationIdx: number): string {
  const prefix = `sub-${stationIdx}`;
  return `
    <div class="station-section">
      ${station.station_name ? `<h3 class="station-name">${station.station_name}</h3>` : ""}
      <div class="direction-columns">
        ${renderDirection("Uptown", station.northbound, `${prefix}-n`)}
        ${renderDirection("Downtown", station.southbound, `${prefix}-s`)}
      </div>
    </div>
  `;
}

export function renderSubwayCard(
  data: SubwayResponse,
  container: HTMLElement
): void {
  if (data.error) {
    container.innerHTML = `<p class="error-text">${data.error}</p>`;
    return;
  }

  container.innerHTML = data.stations
    .map((s, i) => renderStation(s, i))
    .join("");

  // Register countdowns
  data.stations.forEach((station, si) => {
    const prefix = `sub-${si}`;
    station.northbound.slice(0, MAX_ARRIVALS).forEach((a, i) => {
      const el = document.getElementById(`${prefix}-n-${i}`);
      if (el) registerCountdown(el, a.arrival_time);
    });
    station.southbound.slice(0, MAX_ARRIVALS).forEach((a, i) => {
      const el = document.getElementById(`${prefix}-s-${i}`);
      if (el) registerCountdown(el, a.arrival_time);
    });
  });
}
