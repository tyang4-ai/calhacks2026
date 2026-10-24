import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./ui/fonts";
import "./ui/kit.css";
import { App } from "./app/App";
import { installTestHooks } from "./core/testHooks";
import { installSources } from "./sources";

installTestHooks();
installSources();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
