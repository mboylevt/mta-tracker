import type { BusResponse } from "../types";
import { registerCountdown } from "./CountdownTimer";

const MAX_ARRIVALS = 5;

export function renderBusCard(
  data: BusResponse,
  container: HTMLElement,
  idPrefix: string = "bus"
): void {
  if (data.error) {
    container.innerHTML = `<p class="no-service">${data.error}</p>`;
    return;
  }

  if (data.arrivals.length === 0) {
    container.innerHTML = '<p class="no-service">No buses scheduled</p>';
    return;
  }

  const arrivals = data.arrivals.slice(0, MAX_ARRIVALS);

  const rows = arrivals
    .map(
      (a, i) => `
      <tr class="arrival-row">
        <td><span class="bus-route">${a.route}</span></td>
        <td class="headsign">${a.direction}</td>
        <td class="distance">${a.distance_text}</td>
        <td class="countdown" id="${idPrefix}-${i}">${Math.round(a.minutes_until_arrival)} min</td>
      </tr>`
    )
    .join("");

  container.innerHTML = `<table class="arrivals-table"><tbody>${rows}</tbody></table>`;

  arrivals.forEach((a, i) => {
    const el = document.getElementById(`${idPrefix}-${i}`);
    if (el) {
      registerCountdown(
        el,
        new Date(Date.now() + a.minutes_until_arrival * 60000).toISOString()
      );
    }
  });
}
