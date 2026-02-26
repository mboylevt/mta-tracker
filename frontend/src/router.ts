export interface Route {
  page: "home" | "dashboard" | "config";
  id?: string;
}

export function parseHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, "");

  if (hash.startsWith("dashboard/")) {
    return { page: "dashboard", id: hash.slice("dashboard/".length) };
  }
  if (hash === "config/new") {
    return { page: "config" };
  }
  if (hash.startsWith("config/")) {
    return { page: "config", id: hash.slice("config/".length) };
  }

  return { page: "home" };
}

export function navigate(path: string): void {
  window.location.hash = `#/${path}`;
}

export function onRouteChange(callback: (route: Route) => void): void {
  const handler = () => callback(parseHash());
  window.addEventListener("hashchange", handler);
  handler(); // fire on initial load
}
