import { fetchSubway, fetchBus, fetchCitibike } from "./api";
import { renderSubwayCard } from "./components/SubwayCard";
import { renderBusCard } from "./components/BusCard";
import { renderCitibikeCard } from "./components/CitibikeCard";
import { clearCountdowns, startCountdownTimer } from "./components/CountdownTimer";
import { showStale, hideBanner } from "./components/StatusBanner";
import "./styles/main.css";

const REFRESH_MS = 30_000;
let hasSubwayData = false;
let hasBusData = false;
let hasCitibikeData = false;

async function refresh(): Promise<void> {
  clearCountdowns();

  const [subwayResult, busResult, citibikeResult] = await Promise.allSettled([
    fetchSubway(),
    fetchBus(),
    fetchCitibike(),
  ]);

  let anyFailed = false;

  if (subwayResult.status === "fulfilled") {
    renderSubwayCard(subwayResult.value);
    hasSubwayData = true;
  } else {
    console.error("Subway fetch failed:", subwayResult.reason);
    anyFailed = true;
    if (!hasSubwayData) {
      document.getElementById("subway-content")!.innerHTML =
        '<p class="error-text">Failed to load subway data</p>';
    }
  }

  if (busResult.status === "fulfilled") {
    renderBusCard(busResult.value);
    hasBusData = true;
  } else {
    console.error("Bus fetch failed:", busResult.reason);
    anyFailed = true;
    if (!hasBusData) {
      document.getElementById("bus-content")!.innerHTML =
        '<p class="error-text">Failed to load bus data</p>';
    }
  }

  if (citibikeResult.status === "fulfilled") {
    renderCitibikeCard(citibikeResult.value);
    hasCitibikeData = true;
  } else {
    console.error("Citibike fetch failed:", citibikeResult.reason);
    anyFailed = true;
    if (!hasCitibikeData) {
      document.getElementById("citibike-content")!.innerHTML =
        '<p class="error-text">Failed to load bike data</p>';
    }
  }

  if (anyFailed && (hasSubwayData || hasBusData || hasCitibikeData)) {
    showStale();
  } else if (!anyFailed) {
    hideBanner();
  }

  startCountdownTimer();

  const updatedEl = document.getElementById("last-updated");
  if (updatedEl) {
    updatedEl.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
  }
}

// Initial load
refresh();

// Auto-refresh
setInterval(refresh, REFRESH_MS);
