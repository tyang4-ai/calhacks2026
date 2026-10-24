// Every route in ui-contract.md. An unknown route or studio view redirects to /demo.
import type { ReactNode } from "react";
import { Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from "react-router";
import { STUDIO_VIEWS, type StudioView } from "../core/featureTypes";
import { DemoStage } from "./demo/DemoStage";
import { BuyerSurface, MakerSurface, OwnerSurface, StudioSurface } from "./surfaces";
import { useDrawerParams, withoutDrawer } from "./useDrawer";

/** A surface on its own route: its frame at full size, centered on the paper ground. */
function SurfacePage({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--c-color-paper)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--c-space-32)",
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  );
}

function StudioRoute() {
  const { view } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { drawer, refId, open, close } = useDrawerParams();
  if (!view || !STUDIO_VIEWS.includes(view as StudioView)) return <Navigate to="/demo" replace />;
  return (
    <SurfacePage>
      <StudioSurface
        view={view as StudioView}
        drawer={drawer}
        refId={refId}
        // Switching views removes the drawer parameter.
        onViewChange={(v) => navigate(`/studio/${v}${withoutDrawer(search)}`)}
        onOpenDrawer={open}
        onCloseDrawer={close}
      />
    </SurfacePage>
  );
}

function MakerRoute() {
  const { makerId } = useParams();
  return (
    <SurfacePage>
      <MakerSurface makerId={makerId ?? "mkr_01"} />
    </SurfacePage>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/demo" replace />} />
      <Route path="/demo" element={<DemoStage />} />
      <Route
        path="/buyer"
        element={
          <SurfacePage>
            <BuyerSurface />
          </SurfacePage>
        }
      />
      <Route path="/studio/:view" element={<StudioRoute />} />
      <Route
        path="/owner"
        element={
          <SurfacePage>
            <OwnerSurface />
          </SurfacePage>
        }
      />
      <Route path="/maker/:makerId" element={<MakerRoute />} />
      <Route path="*" element={<Navigate to="/demo" replace />} />
    </Routes>
  );
}
