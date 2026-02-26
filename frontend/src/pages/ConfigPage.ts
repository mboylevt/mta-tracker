import type {
  DashboardConfig,
  SubwayStopConfig,
  BusStopConfig,
  CitibikeStationConfig,
} from "../types";
import {
  fetchDashboard,
  createDashboard,
  updateDashboard,
  searchSubwayStations,
  searchBusStops,
  searchCitibikeStations,
} from "../api";
import { navigate } from "../router";

let currentConfig: DashboardConfig = {
  id: "",
  name: "",
  subway_stops: [],
  bus_stops: [],
  citibike_stations: [],
};
let isEdit = false;

// Track full available lines per subway stop so we can render toggles
let allLinesMap: Record<string, string[]> = {};

function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timer: number;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), ms);
  };
}

function renderSelectedSubway(): string {
  return currentConfig.subway_stops
    .map((s, i) => {
      const available = allLinesMap[s.stop_id] || s.lines;
      const bullets = available
        .map((l) => {
          const active = s.lines.includes(l);
          const cls = active
            ? `line-bullet-sm line-${l.toLowerCase()}`
            : `line-bullet-sm line-bullet-off`;
          return `<span class="${cls} line-toggle" data-stop="${i}" data-line="${l}" title="${active ? "Click to hide" : "Click to show"} ${l} trains">${l}</span>`;
        })
        .join("");
      return `
    <div class="selected-item">
      <span>${bullets} ${s.name}</span>
      <button class="btn-remove" data-type="subway" data-index="${i}">&times;</button>
    </div>`;
    })
    .join("");
}

function renderSelectedBus(): string {
  return currentConfig.bus_stops
    .map(
      (s, i) => `
    <div class="selected-item">
      <span>${s.name} ${s.routes.length ? `<small>(${s.routes.join(", ")})</small>` : ""}</span>
      <button class="btn-remove" data-type="bus" data-index="${i}">&times;</button>
    </div>`
    )
    .join("");
}

function renderSelectedCitibike(): string {
  return currentConfig.citibike_stations
    .map(
      (s, i) => `
    <div class="selected-item">
      <span>${s.name}</span>
      <button class="btn-remove" data-type="citibike" data-index="${i}">&times;</button>
    </div>`
    )
    .join("");
}

function bindRemoveButtons(container: HTMLElement): void {
  container.querySelectorAll(".btn-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      const el = btn as HTMLElement;
      const type = el.dataset.type!;
      const idx = parseInt(el.dataset.index!, 10);
      if (type === "subway") {
        const removed = currentConfig.subway_stops.splice(idx, 1);
        if (removed.length) delete allLinesMap[removed[0].stop_id];
      } else if (type === "bus") {
        currentConfig.bus_stops.splice(idx, 1);
      } else if (type === "citibike") {
        currentConfig.citibike_stations.splice(idx, 1);
      }
      refreshSelections(container);
    });
  });
}

function bindLineToggles(container: HTMLElement): void {
  container.querySelectorAll(".line-toggle").forEach((el) => {
    el.addEventListener("click", () => {
      const stopIdx = parseInt((el as HTMLElement).dataset.stop!, 10);
      const line = (el as HTMLElement).dataset.line!;
      const stop = currentConfig.subway_stops[stopIdx];
      if (!stop) return;

      const idx = stop.lines.indexOf(line);
      if (idx >= 0) {
        // Don't allow deselecting the last line
        if (stop.lines.length > 1) {
          stop.lines.splice(idx, 1);
        }
      } else {
        stop.lines.push(line);
      }
      refreshSelections(container);
    });
  });
}

function refreshSelections(container: HTMLElement): void {
  const subSel = container.querySelector("#subway-selected");
  const busSel = container.querySelector("#bus-selected");
  const bikeSel = container.querySelector("#citibike-selected");
  if (subSel) subSel.innerHTML = renderSelectedSubway();
  if (busSel) busSel.innerHTML = renderSelectedBus();
  if (bikeSel) bikeSel.innerHTML = renderSelectedCitibike();
  bindRemoveButtons(container);
  bindLineToggles(container);
}

function setupSearch(
  container: HTMLElement,
  inputId: string,
  resultsId: string,
  searchFn: (q: string) => Promise<unknown[]>,
  onSelect: (item: unknown) => void
): void {
  const input = container.querySelector(`#${inputId}`) as HTMLInputElement;
  const resultsEl = container.querySelector(`#${resultsId}`) as HTMLElement;

  const doSearch = debounce(async (...args: unknown[]) => {
    const q = args[0] as string;
    if (q.length < 2) {
      resultsEl.innerHTML = "";
      return;
    }
    resultsEl.innerHTML = '<div class="search-loading">Searching...</div>';
    try {
      const items = await searchFn(q);
      if (items.length === 0) {
        resultsEl.innerHTML =
          '<div class="search-empty">No results found</div>';
        return;
      }
      resultsEl.innerHTML = items
        .map(
          (item, i) =>
            `<div class="search-result" data-index="${i}">${formatResult(inputId, item)}</div>`
        )
        .join("");
      resultsEl.querySelectorAll(".search-result").forEach((el, i) => {
        el.addEventListener("click", () => {
          onSelect(items[i]);
          resultsEl.innerHTML = "";
          input.value = "";
          refreshSelections(container);
        });
      });
    } catch (e) {
      console.error("Search failed", e);
      resultsEl.innerHTML =
        '<div class="search-empty">Search failed</div>';
    }
  }, 300);

  input.addEventListener("input", () => {
    doSearch(input.value.trim());
  });
}

function formatResult(inputId: string, item: unknown): string {
  const rec = item as Record<string, unknown>;
  if (inputId === "subway-search") {
    const lines = (rec.lines as string[]) || [];
    const bullets = lines
      .map(
        (l: string) =>
          `<span class="line-bullet-sm line-${l.toLowerCase()}">${l}</span>`
      )
      .join("");
    return `${bullets} ${rec.name}`;
  }
  if (inputId === "bus-search") {
    const routes = (rec.routes as string[]) || [];
    return `${rec.name} ${routes.length ? `<small>(${routes.join(", ")})</small>` : ""}`;
  }
  return `${rec.name}`;
}

export async function renderConfigPage(
  container: HTMLElement,
  dashboardId?: string
): Promise<void> {
  isEdit = !!dashboardId;

  if (isEdit) {
    container.innerHTML = '<div class="loading">Loading config...</div>';
    try {
      currentConfig = await fetchDashboard(dashboardId!);
    } catch {
      container.innerHTML =
        '<p class="error-text">Dashboard not found. <a href="#/">Go home</a></p>';
      return;
    }
  } else {
    currentConfig = {
      id: "",
      name: "",
      subway_stops: [],
      bus_stops: [],
      citibike_stations: [],
    };
  }

  // Initialize allLinesMap from existing config (for edit mode)
  allLinesMap = {};
  for (const s of currentConfig.subway_stops) {
    allLinesMap[s.stop_id] = [...s.lines];
  }

  container.innerHTML = `
    <div class="config-page">
      <div class="config-header">
        <button class="btn btn-small" id="cancel-btn">&larr; Cancel</button>
        <h2>${isEdit ? "Edit" : "New"} Dashboard</h2>
      </div>

      <div class="config-section">
        <label class="config-label" for="dash-name">Dashboard Name</label>
        <input type="text" id="dash-name" class="config-input" placeholder="e.g. My Commute" value="${currentConfig.name}" />
      </div>

      <div class="config-section">
        <h3 class="config-section-title">Subway Stations</h3>
        <p class="config-hint">Click line circles to toggle which trains to show.</p>
        <input type="text" id="subway-search" class="config-input" placeholder="Search stations..." />
        <div id="subway-results" class="search-results"></div>
        <div id="subway-selected" class="selected-list">${renderSelectedSubway()}</div>
      </div>

      <div class="config-section">
        <h3 class="config-section-title">Bus Stops</h3>
        <input type="text" id="bus-search" class="config-input" placeholder="Search stops or routes..." />
        <div id="bus-results" class="search-results"></div>
        <div id="bus-selected" class="selected-list">${renderSelectedBus()}</div>
      </div>

      <div class="config-section">
        <h3 class="config-section-title">Citi Bike Stations</h3>
        <input type="text" id="citibike-search" class="config-input" placeholder="Search stations..." />
        <div id="citibike-results" class="search-results"></div>
        <div id="citibike-selected" class="selected-list">${renderSelectedCitibike()}</div>
      </div>

      <div class="config-actions">
        <button class="btn btn-primary" id="save-btn">Save Dashboard</button>
      </div>
    </div>
  `;

  bindRemoveButtons(container);
  bindLineToggles(container);

  // Wire up search
  setupSearch(
    container,
    "subway-search",
    "subway-results",
    searchSubwayStations,
    (item) => {
      const r = item as { stop_id: string; name: string; lines: string[] };
      if (!currentConfig.subway_stops.find((s) => s.stop_id === r.stop_id)) {
        allLinesMap[r.stop_id] = [...r.lines];
        currentConfig.subway_stops.push({
          stop_id: r.stop_id,
          name: r.name,
          lines: [...r.lines], // all selected by default
        } as SubwayStopConfig);
      }
    }
  );

  setupSearch(
    container,
    "bus-search",
    "bus-results",
    searchBusStops,
    (item) => {
      const r = item as { stop_id: string; name: string; routes: string[] };
      if (!currentConfig.bus_stops.find((s) => s.stop_id === r.stop_id)) {
        currentConfig.bus_stops.push({
          stop_id: r.stop_id,
          name: r.name,
          routes: r.routes,
        } as BusStopConfig);
      }
    }
  );

  setupSearch(
    container,
    "citibike-search",
    "citibike-results",
    searchCitibikeStations,
    (item) => {
      const r = item as { station_id: string; name: string };
      if (
        !currentConfig.citibike_stations.find(
          (s) => s.station_id === r.station_id
        )
      ) {
        currentConfig.citibike_stations.push({
          station_id: r.station_id,
          name: r.name,
        } as CitibikeStationConfig);
      }
    }
  );

  // Cancel
  document.getElementById("cancel-btn")!.addEventListener("click", () => {
    if (isEdit) navigate(`dashboard/${currentConfig.id}`);
    else navigate("");
  });

  // Save
  document.getElementById("save-btn")!.addEventListener("click", async () => {
    const nameInput = document.getElementById("dash-name") as HTMLInputElement;
    currentConfig.name = nameInput.value.trim();
    if (!currentConfig.name) {
      nameInput.focus();
      nameInput.classList.add("input-error");
      return;
    }

    try {
      let saved: DashboardConfig;
      if (isEdit) {
        saved = await updateDashboard(currentConfig.id, currentConfig);
      } else {
        saved = await createDashboard(currentConfig);
      }
      navigate(`dashboard/${saved.id}`);
    } catch (e) {
      console.error("Save failed", e);
      alert("Failed to save dashboard");
    }
  });
}
