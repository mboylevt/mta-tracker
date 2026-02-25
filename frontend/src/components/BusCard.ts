import type { BusArrival, BusResponse } from "../types";
import { registerCountdown } from "./CountdownTimer";

const MAX_ARRIVALS = 5;

function renderBusGroup(label: string, arrivals: BusArrival[], idPrefix: string): string {
  if (arrivals.length === 0) {
    return `
      <div class="direction-group">
        <h3 class="direction-label">${label}</h3>
        <p class="no-service">No buses scheduled</p>
      </div>
    `;
  }

  const rows = arrivals
    .map(
      (arrival, i) => `
      <tr class="arrival-row">
        <td><span class="bus-route">${arrival.route}</span></td>
        <td class="distance">${arrival.distance_text}</td>
        <td class="countdown" id="${idPrefix}-${i}">${Math.round(arrival.minutes_until_arrival)} min</td>
      </tr>
    `
    )
    .join("");

  return `
    <div class="direction-group">
      <h3 class="direction-label">${label}</h3>
      <table class="arrivals-table">
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

export function renderBusCard(data: BusResponse): void {
  const container = document.getElementById("bus-content")!;

  if (data.error) {
    container.innerHTML = `<p class="no-service">${data.error}</p>`;
    return;
  }

  if (data.arrivals.length === 0) {
    container.innerHTML = '<p class="no-service">No buses scheduled</p>';
    return;
  }

  // Group arrivals into Northbound / Southbound
  const northbound: BusArrival[] = [];
  const southbound: BusArrival[] = [];
  for (const arrival of data.arrivals) {
    const dir = arrival.direction.toUpperCase();
    if (dir.includes("RIKERS") || dir.includes("EAST ELMHURST") || dir.includes("FLUSHING")) {
      northbound.push(arrival);
    } else {
      southbound.push(arrival);
    }
  }

  const directions: [string, BusArrival[]][] = [
    ["Southbound", southbound],
    ["Northbound", northbound],
  ];

  const html = directions
    .map(([label, arrivals], gi) => {
      const limited = arrivals.slice(0, MAX_ARRIVALS);
      return renderBusGroup(label, limited, `bus-${gi}`);
    })
    .join("");

  container.innerHTML = `<div class="direction-columns">${html}</div>`;

  directions.forEach(([_label, arrivals], gi) => {
    registerBusCountdowns(arrivals.slice(0, MAX_ARRIVALS), `bus-${gi}`);
  });
}

function registerBusCountdowns(arrivals: BusArrival[], idPrefix: string): void {
  arrivals.forEach((arrival, i) => {
    const el = document.getElementById(`${idPrefix}-${i}`);
    if (el) {
      const arrivalTime = new Date(
        Date.now() + arrival.minutes_until_arrival * 60000
      ).toISOString();
      registerCountdown(el, arrivalTime);
    }
  });
}
