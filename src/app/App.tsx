import { BrowserRouter, useLocation } from "react-router";
import { DemoControls } from "./controls/DemoControls";
import { useRouterNavigator } from "./navigators";
import { AppRoutes } from "./routes";

/** The router navigator on every route but /demo, where the stage registers its own. */
function RouterNavigator() {
  const { pathname } = useLocation();
  useRouterNavigator(!/^\/demo\/?$/.test(pathname));
  return null;
}

export function App() {
  return (
    <BrowserRouter>
      <RouterNavigator />
      <AppRoutes />
      <DemoControls />
    </BrowserRouter>
  );
}
