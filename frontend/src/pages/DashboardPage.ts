import type { DashboardConfig } from "../types";
import { fetchDashboard, fetchSubway, fetchBus, fetchCitibike, fetchAlerts } from "../api";
import { renderSubwayCard } from "../components/SubwayCard";
import { renderBusCard } from "../components/BusCard";
import { renderCitibikeCard } from "../components/CitibikeCard";
import { renderAlertsBanner } from "../components/AlertsBanner";
import {
  clearCountdowns,
  startCountdownTimer,
} from "../components/CountdownTimer";
import { showStale, hideBanner } from "../components/StatusBanner";
import { navigate } from "../router";

const REFRESH_MS = 30_000;
let refreshInterval: number | null = null;
let config: DashboardConfig | null = null;

function stopRefresh(): void {
  if (refreshInterval !== null) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

async function refresh(): Promise<void> {
  if (!config) return;
  clearCountdowns();

  const promises: Promise<unknown>[] = [];
  const promiseLabels: string[] = [];

  // Alerts — collect all routes from the dashboard config
  const subwayRoutes = config.subway_stops.flatMap((s) => s.lines);
  const busRoutes = config.bus_stops.flatMap((s) => s.routes);
  if (subwayRoutes.length || busRoutes.length) {
    promises.push(fetchAlerts(subwayRoutes, busRoutes));
    promiseLabels.push("alerts");
  }

  // Subway — single fetch for all stops
  const subwayStops = config.subway_stops.map((s) => ({
    stop_id: s.stop_id,
    lines: s.lines,
  }));
  if (subwayStops.length) {
    promises.push(fetchSubway(subwayStops));
    promiseLabels.push("subway");
  }

  // Bus — one fetch per stop
  for (let i = 0; i < config.bus_stops.length; i++) {
    promises.push(fetchBus([config.bus_stops[i].stop_id]));
    promiseLabels.push(`bus-${i}`);
  }

  // Citibike
  const bikeIds = config.citibike_stations.map((s) => s.station_id);
  if (bikeIds.length) {
    promises.push(fetchCitibike(bikeIds));
    promiseLabels.push("citibike");
  }

  const results = await Promise.allSettled(promises);
  let anyFailed = false;
  let anyData = false;

  for (let i = 0; i < results.length; i++) {
    const label = promiseLabels[i];
    const r = results[i];

    if (label === "alerts") {
      const alertsContainer = document.getElementById("alerts-content");
      if (r.status === "fulfilled" && alertsContainer) {
        renderAlertsBanner(
          r.value as import("../types").AlertsResponse,
          alertsContainer
        );
      }
      // Don't count alerts failure as a data failure
      continue;
    }

    if (label === "subway") {
      if (r.status === "fulfilled") {
        const data = r.value as import("../types").SubwayResponse;
        for (const station of data.stations) {
          const cfg = config!.subway_stops.find(
            (s) => s.stop_id === station.stop_id
          );
          if (cfg) station.station_name = cfg.name;
        }
        renderSubwayCard(data, document.getElementById("subway-content")!);
        anyData = true;
      } else {
        anyFailed = true;
      }
    } else if (label.startsWith("bus-")) {
      const busIdx = parseInt(label.slice(4), 10);
      const container = document.getElementById(`bus-content-${busIdx}`);
      if (r.status === "fulfilled" && container) {
        renderBusCard(
          r.value as import("../types").BusResponse,
          container,
          `bus${busIdx}`
        );
        anyData = true;
      } else if (r.status === "rejected") {
        anyFailed = true;
      }
    } else if (label === "citibike") {
      if (r.status === "fulfilled") {
        renderCitibikeCard(
          r.value as import("../types").CitibikeResponse,
          document.getElementById("citibike-content")!
        );
        anyData = true;
      } else {
        anyFailed = true;
      }
    }
  }

  if (anyFailed && anyData) showStale();
  else if (!anyFailed) hideBanner();

  startCountdownTimer();

  const ts = document.getElementById("last-updated");
  if (ts) ts.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
}

export async function renderDashboardPage(
  container: HTMLElement,
  dashboardId: string
): Promise<void> {
  stopRefresh();
  container.innerHTML = '<div class="loading">Loading dashboard...</div>';

  try {
    config = await fetchDashboard(dashboardId);
  } catch {
    container.innerHTML =
      '<p class="error-text">Dashboard not found. <a href="#/">Go home</a></p>';
    return;
  }

  // Build cards HTML based on what's configured
  let cardsHtml = "";

  if (config.subway_stops.length > 0) {
    const bullets = config.subway_stops
      .flatMap((s) => s.lines)
      .filter((v, i, a) => a.indexOf(v) === i)
      .map((l) => `<span class="line-bullet line-${l.toLowerCase()}">${l}</span>`)
      .join("");
    const names = config.subway_stops.map((s) => s.name).join(", ");
    cardsHtml += `
      <section class="card">
        <div class="card-header subway-header">
          <h2>${bullets} ${names}</h2>
        </div>
        <div class="card-body" id="subway-content">
          <div class="loading">Loading subway data...</div>
        </div>
      </section>
    `;
  }

  // One card per bus stop
  config.bus_stops.forEach((stop, i) => {
    const routes = stop.routes.length
      ? ` <small>(${stop.routes.join(", ")})</small>`
      : "";
    cardsHtml += `
      <section class="card">
        <div class="card-header bus-header">
          <h2>Bus &mdash; ${stop.name}${routes}</h2>
        </div>
        <div class="card-body" id="bus-content-${i}">
          <div class="loading">Loading bus data...</div>
        </div>
      </section>
    `;
  });

  if (config.citibike_stations.length > 0) {
    cardsHtml += `
      <section class="card">
        <div class="card-header citibike-header">
          <h2>Citi Bike</h2>
        </div>
        <div class="card-body" id="citibike-content">
          <div class="loading">Loading bike data...</div>
        </div>
      </section>
    `;
  }

  if (!cardsHtml) {
    cardsHtml =
      '<p class="no-service">No stations configured. <a href="#/config/' +
      dashboardId +
      '">Edit this dashboard</a> to add some.</p>';
  }

  container.innerHTML = `
    <div class="dashboard-toolbar">
      <button class="btn btn-small" id="back-btn">&larr; All Dashboards</button>
      <h2 class="dashboard-title">${config.name}</h2>
      <button class="btn btn-small btn-edit" id="edit-btn">Edit</button>
    </div>
    <div id="alerts-content" class="alerts-container" style="display:none"></div>
    <div class="cards-container">${cardsHtml}</div>
    <footer class="app-footer"><span id="last-updated"></span></footer>
  `;

  document.getElementById("back-btn")!.addEventListener("click", () => {
    navigate("");
  });
  document.getElementById("edit-btn")!.addEventListener("click", () => {
    navigate(`config/${dashboardId}`);
  });

  await refresh();
  refreshInterval = window.setInterval(refresh, REFRESH_MS);
}

export function teardownDashboardPage(): void {
  stopRefresh();
  clearCountdowns();
}
