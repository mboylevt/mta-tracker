import { onRouteChange } from "./router";
import { renderHomePage } from "./pages/HomePage";
import {
  renderDashboardPage,
  teardownDashboardPage,
} from "./pages/DashboardPage";
import { renderConfigPage } from "./pages/ConfigPage";
import { hideBanner } from "./components/StatusBanner";
import "./styles/main.css";

const content = () => document.getElementById("page-content")!;

onRouteChange(async (route) => {
  teardownDashboardPage();
  hideBanner();

  switch (route.page) {
    case "dashboard":
      if (route.id) await renderDashboardPage(content(), route.id);
      break;
    case "config":
      await renderConfigPage(content(), route.id);
      break;
    default:
      await renderHomePage(content());
  }
});
