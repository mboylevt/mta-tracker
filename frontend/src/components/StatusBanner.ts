const banner = () => document.getElementById("status-banner")!;

export function showError(message: string): void {
  const el = banner();
  el.className = "banner banner-error";
  el.textContent = message;
  el.style.display = "block";
}

export function showStale(): void {
  const el = banner();
  el.className = "banner banner-stale";
  el.textContent = "Using cached data — connection issue";
  el.style.display = "block";
}

export function showLoading(): void {
  const el = banner();
  el.className = "banner banner-loading";
  el.textContent = "Refreshing...";
  el.style.display = "block";
}

export function hideBanner(): void {
  banner().style.display = "none";
}
