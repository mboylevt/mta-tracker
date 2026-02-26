import type { DashboardSummary } from "../types";
import { fetchDashboards, deleteDashboard } from "../api";
import { navigate } from "../router";

export async function renderHomePage(container: HTMLElement): Promise<void> {
  container.innerHTML = '<div class="loading">Loading dashboards...</div>';

  let dashboards: DashboardSummary[] = [];
  try {
    dashboards = await fetchDashboards();
  } catch (e) {
    console.error("Failed to load dashboards", e);
  }

  if (dashboards.length === 0) {
    container.innerHTML = `
      <div class="home-page">
        <div class="empty-state">
          <h2>No dashboards yet</h2>
          <p>Create a dashboard to track your subway, bus, and Citi Bike stations.</p>
          <button class="btn btn-primary" id="create-btn">Create Dashboard</button>
        </div>
      </div>
    `;
    document.getElementById("create-btn")!.addEventListener("click", () => {
      navigate("config/new");
    });
    return;
  }

  const cards = dashboards
    .map(
      (d) => `
    <div class="dashboard-card" data-id="${d.id}">
      <div class="dashboard-card-body">
        <h3>${d.name}</h3>
        <div class="dashboard-card-stats">
          ${d.subway_stop_count ? `<span class="stat-badge subway-badge">${d.subway_stop_count} subway</span>` : ""}
          ${d.bus_stop_count ? `<span class="stat-badge bus-badge">${d.bus_stop_count} bus</span>` : ""}
          ${d.citibike_station_count ? `<span class="stat-badge citibike-badge">${d.citibike_station_count} bike</span>` : ""}
        </div>
      </div>
      <div class="dashboard-card-actions">
        <button class="btn btn-small btn-open" data-id="${d.id}">Open</button>
        <button class="btn btn-small btn-edit" data-id="${d.id}">Edit</button>
        <button class="btn btn-small btn-danger btn-delete" data-id="${d.id}">Delete</button>
      </div>
    </div>
  `
    )
    .join("");

  container.innerHTML = `
    <div class="home-page">
      <div class="home-header">
        <h2>Your Dashboards</h2>
        <button class="btn btn-primary" id="create-btn">+ New Dashboard</button>
      </div>
      <div class="dashboard-list">${cards}</div>
    </div>
  `;

  document.getElementById("create-btn")!.addEventListener("click", () => {
    navigate("config/new");
  });

  container.querySelectorAll(".btn-open").forEach((btn) => {
    btn.addEventListener("click", () => {
      navigate(`dashboard/${(btn as HTMLElement).dataset.id}`);
    });
  });

  container.querySelectorAll(".btn-edit").forEach((btn) => {
    btn.addEventListener("click", () => {
      navigate(`config/${(btn as HTMLElement).dataset.id}`);
    });
  });

  container.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = (btn as HTMLElement).dataset.id!;
      if (confirm("Delete this dashboard?")) {
        await deleteDashboard(id);
        renderHomePage(container);
      }
    });
  });
}
