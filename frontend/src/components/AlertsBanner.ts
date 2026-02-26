import type { AlertsResponse, ServiceAlert } from "../types";

function routeBullet(route: string, alertType: string): string {
  if (alertType === "subway") {
    return `<span class="line-bullet-sm line-${route.toLowerCase()}">${route}</span>`;
  }
  return `<span class="bus-route-sm">${route}</span>`;
}

function renderAlert(alert: ServiceAlert): string {
  const bullets = alert.affected_routes
    .map((r) => routeBullet(r, alert.alert_type))
    .join(" ");

  const id = `alert-desc-${alert.alert_id.replace(/[^a-zA-Z0-9]/g, "")}`;
  const hasDescription =
    alert.description && alert.description !== alert.header;

  return `
    <div class="service-alert" data-toggle-id="${id}">
      <div class="service-alert-header">
        <div class="service-alert-routes">${bullets}</div>
        <span class="service-alert-effect">${alert.effect}</span>
        <span class="service-alert-text">${escapeHtml(alert.header)}</span>
        ${hasDescription ? `<button class="service-alert-expand" aria-label="Toggle details" data-target="${id}">&#9660;</button>` : ""}
      </div>
      ${
        hasDescription
          ? `<div class="service-alert-description" id="${id}">${escapeHtml(alert.description)}</div>`
          : ""
      }
    </div>
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export function renderAlertsBanner(
  data: AlertsResponse,
  container: HTMLElement
): void {
  if (!data.alerts.length) {
    container.innerHTML = "";
    container.style.display = "none";
    return;
  }

  container.style.display = "block";
  container.innerHTML = `
    <div class="alerts-banner">
      <div class="alerts-banner-header">
        <span class="alerts-banner-icon">&#9888;</span>
        <span>Service Alerts (${data.alerts.length})</span>
      </div>
      <div class="alerts-list">
        ${data.alerts.map(renderAlert).join("")}
      </div>
    </div>
  `;

  // Wire up expand/collapse toggles
  container.querySelectorAll(".service-alert-expand").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const target = (btn as HTMLElement).dataset.target!;
      const desc = document.getElementById(target);
      if (desc) {
        const expanded = desc.classList.toggle("expanded");
        btn.textContent = expanded ? "\u25B2" : "\u25BC";
      }
    });
  });

  // Also allow clicking the whole header row to toggle
  container.querySelectorAll(".service-alert").forEach((el) => {
    const alertEl = el as HTMLElement;
    const id = alertEl.dataset.toggleId!;
    const desc = document.getElementById(id);
    if (!desc) return;
    alertEl
      .querySelector(".service-alert-header")!
      .addEventListener("click", () => {
        const expanded = desc.classList.toggle("expanded");
        const btn = alertEl.querySelector(".service-alert-expand");
        if (btn) btn.textContent = expanded ? "\u25B2" : "\u25BC";
      });
  });
}
