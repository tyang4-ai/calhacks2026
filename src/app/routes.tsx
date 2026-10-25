// Every route in ui-contract.md (Routes). The root and every unknown route or Sell view redirect to
// /shop. /buyer, /studio/:view and /owner redirect to /shop, /sell/:view and /sell/approvals,
// keeping the query string. On routes, drawers and the process overlay live in the URL.
import { lazy, Suspense, type ComponentType, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation, useParams, useSearchParams } from "react-router";
import { DemoStage } from "./demo/DemoStage";
import type { ShopPage } from "./slotProps";
import { useStageScale } from "./stageScale";
import { SHELL } from "./strings";
import { MakerSurface, SellSurface, ShopSurface, StoreSurface, isSellView } from "./surfaces";
import { useDrawerParams } from "./useDrawer";
import { useProcessParam } from "./useProcessParam";

/**
 * A surface on its own route: its 1440 by 900 frame centered on the paper ground, zoomed to fill a
 * bigger window like /demo's stage, and never below full size.
 */
function SurfacePage({ children }: { children: ReactNode }) {
  const zoom = Math.max(1, useStageScale());
  return (
    <div style={{ minHeight: "100vh", background: "var(--c-color-paper)", display: "flex", boxSizing: "border-box" }}>
      {/* margin: auto centers the frame without cutting it off when the window is smaller. */}
      <div style={{ margin: "auto", flexShrink: 0, zoom }}>{children}</div>
    </div>
  );
}

function ShopRoute({ page }: { page: ShopPage }) {
  const params = useParams();
  const [search] = useSearchParams();
  const { drawer, refId, close } = useDrawerParams("buyer");
  const processId = useProcessParam();
  const q = search.get("q");
  return (
    <SurfacePage>
      <ShopSurface
        page={page}
        pieceId={params.pieceId}
        orderId={params.orderId}
        communityId={params.communityId}
        projectId={params.id}
        searchParams={page === "search" ? { q: q ? q : undefined, k: search.getAll("k") } : undefined}
        drawer={drawer}
        refId={refId}
        processId={processId}
        onCloseDrawer={close}
      />
    </SurfacePage>
  );
}

function SellRoute() {
  const { view } = useParams();
  const { drawer, refId, close } = useDrawerParams("studio");
  const processId = useProcessParam();
  if (!isSellView(view)) return <Navigate to="/shop" replace />;
  return (
    <SurfacePage>
      <SellSurface view={view} drawer={drawer} refId={refId} processId={processId} onCloseDrawer={close} />
    </SurfacePage>
  );
}

function MakerRoute() {
  const { makerId } = useParams();
  const { drawer, refId, close } = useDrawerParams("maker");
  const processId = useProcessParam();
  return (
    <SurfacePage>
      <MakerSurface makerId={makerId ?? "mkr_01"} drawer={drawer} refId={refId} processId={processId} onCloseDrawer={close} />
    </SurfacePage>
  );
}

function StoreRoute() {
  const { slug } = useParams();
  const { drawer, refId, close } = useDrawerParams("store");
  const processId = useProcessParam();
  return (
    <SurfacePage>
      <StoreSurface slug={slug ?? ""} drawer={drawer} refId={refId} processId={processId} onCloseDrawer={close} />
    </SurfacePage>
  );
}

/** A v1 route's redirect to its v2 page, keeping the query string. */
function Moved({ to }: { to: (params: Readonly<Record<string, string | undefined>>) => string }) {
  const params = useParams();
  const { search } = useLocation();
  return <Navigate to={`${to(params)}${search}`} replace />;
}

// /dev/kit: the kit's gallery, through import.meta.glob so the build passes before I2-kit T4 adds it.
const galleries = import.meta.glob<{ KitGallery?: ComponentType }>("../ui/gallery.tsx");
const loadGallery = Object.values(galleries)[0];

function GalleryMissing() {
  return <p style={{ margin: 0 }}>{SHELL.kitComing.en}</p>;
}

const LazyGallery = loadGallery
  ? lazy(async () => {
      const mod = await loadGallery();
      return { default: mod.KitGallery ?? GalleryMissing };
    })
  : null;

function DevKit() {
  return (
    <div data-testid="dev-kit-gallery" style={{ minHeight: "100vh", boxSizing: "border-box", padding: "var(--c-space-32)", background: "var(--c-color-paper)" }}>
      {LazyGallery ? (
        <Suspense fallback={null}>
          <LazyGallery />
        </Suspense>
      ) : (
        <GalleryMissing />
      )}
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/shop" replace />} />
      <Route path="/demo" element={<DemoStage />} />
      <Route path="/shop" element={<ShopRoute page="home" />} />
      <Route path="/shop/search" element={<ShopRoute page="search" />} />
      <Route path="/shop/piece/:pieceId" element={<ShopRoute page="piece" />} />
      <Route path="/shop/community/:communityId" element={<ShopRoute page="community" />} />
      <Route path="/shop/projects" element={<ShopRoute page="projects" />} />
      <Route path="/shop/projects/:id" element={<ShopRoute page="projects" />} />
      <Route path="/shop/receipt/:orderId" element={<ShopRoute page="receipt" />} />
      <Route path="/store/:slug" element={<StoreRoute />} />
      <Route path="/sell/:view" element={<SellRoute />} />
      <Route path="/maker/:makerId" element={<MakerRoute />} />
      <Route path="/dev/kit" element={<DevKit />} />
      <Route path="/buyer" element={<Moved to={() => "/shop"} />} />
      <Route path="/studio/:view" element={<Moved to={(p) => `/sell/${p.view ?? ""}`} />} />
      <Route path="/owner" element={<Moved to={() => "/sell/approvals"} />} />
      <Route path="*" element={<Navigate to="/shop" replace />} />
    </Routes>
  );
}
