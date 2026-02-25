import type { SubwayArrival, SubwayResponse } from "../types";
import { registerCountdown } from "./CountdownTimer";

function renderArrivalRow(arrival: SubwayArrival, index: number, dirKey: string, label: string): string {
  const lineClass = arrival.line.toLowerCase();
  const delayBadge = arrival.is_delayed
    ? '<span class="delay-badge">DELAYED</span>'
    : "";

  return `
    <tr class="arrival-row">
      <td><span class="line-bullet line-${lineClass}">${arrival.line}</span></td>
      <td class="headsign">${arrival.headsign || label} ${delayBadge}</td>
      <td class="countdown" id="subway-${dirKey}-${index}" data-arrival="${arrival.arrival_time}"></td>
    </tr>
  `;
}

function renderDirection(
  label: string,
  arrivals: SubwayArrival[],
  dirKey: string
): string {
  if (arrivals.length === 0) {
    return `
      <div class="direction-group">
        <h3 class="direction-label">${label}</h3>
        <p class="no-service">No trains scheduled</p>
      </div>
    `;
  }

  const rows = arrivals.map((a, i) => renderArrivalRow(a, i, dirKey, label)).join("");
  return `
    <div class="direction-group">
      <h3 class="direction-label">${label}</h3>
      <table class="arrivals-table">
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

const MAX_ARRIVALS = 5;

export function renderSubwayCard(data: SubwayResponse): void {
  const container = document.getElementById("subway-content")!;

  const manhattan = data.manhattan_bound.slice(0, MAX_ARRIVALS);
  const ditmars = data.ditmars_bound.slice(0, MAX_ARRIVALS);

  container.innerHTML = `<div class="direction-columns">
    ${renderDirection("Manhattan-bound", manhattan, "manhattan")}
    ${renderDirection("Ditmars Blvd-bound", ditmars, "ditmars")}
  </div>`;

  // Register countdown timers for each arrival
  for (const [dirKey, arrivals] of [
    ["manhattan", manhattan],
    ["ditmars", ditmars],
  ] as const) {
    arrivals.forEach((arrival, i) => {
      const el = document.getElementById(`subway-${dirKey}-${i}`);
      if (el) registerCountdown(el, arrival.arrival_time);
    });
  }
}
