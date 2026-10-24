import { BrowserRouter } from "react-router";
import { DemoControls } from "./controls/DemoControls";
import { AppRoutes } from "./routes";

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <DemoControls />
    </BrowserRouter>
  );
}
