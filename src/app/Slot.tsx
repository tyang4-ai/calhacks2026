// One slot: the feature that fills it, inside its own error boundary and Suspense, or the empty
// placeholder with its slot- test ID. The shell forwards the whole SlotProps object to the
// feature, never a hand-picked list. The wrapper carries data-slot, data-slot-state and
// data-slot-props (the JSON of the props it passed), filled or empty, for the smoke tests.
import { Component, createElement, Suspense, useState, type ComponentType, type ReactNode } from "react";
import { SLOT_IDS, slotTestId, type SlotId, type SlotProps } from "../core/featureTypes";
import { lazySlot, readySlot, slotHasFeature } from "./featureLoader";
import { slotProps, slotPropsJson, type SlotContext } from "./slotProps";
import { PLACEHOLDER_NOTE, SLOT_FAILED, SLOT_LABELS } from "./strings";

type SlotState = "empty" | "filled" | "error";

function Wrapper({ slot, state, props, loading, children }: { slot: SlotId; state: SlotState; props: SlotProps; loading?: boolean; children: ReactNode }) {
  return (
    <div
      className="cindia-slot"
      data-slot={slot}
      data-slot-state={state}
      data-slot-props={slotPropsJson(props)}
      data-slot-loading={loading ? "true" : undefined}
      style={{ height: "100%", minHeight: 0, minWidth: 0, display: "flex", flexDirection: "column" }}
    >
      {children}
    </div>
  );
}

function Placeholder({ slot, props, loading }: { slot: SlotId; props: SlotProps; loading?: boolean }) {
  const label = SLOT_LABELS[slot];
  const lang = props.lang;
  return (
    <Wrapper slot={slot} state="empty" props={props} loading={loading}>
      <div
        data-testid={`slot-${slotTestId(slot)}`}
        lang={lang}
        style={{
          flex: 1,
          minHeight: 40,
          border: "1px dashed var(--c-color-line)",
          borderRadius: "var(--c-radius-panel)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--c-space-4)",
          padding: "var(--c-space-12)",
          color: "var(--c-color-ink-soft)",
          textAlign: "center",
          fontSize: "var(--c-text-16)",
          boxSizing: "border-box",
        }}
      >
        <span>{label[lang]}</span>
        <span style={{ fontSize: "var(--c-text-14)" }}>{PLACEHOLDER_NOTE[lang]}</span>
      </div>
    </Wrapper>
  );
}

function SlotError({ slot, props }: { slot: SlotId; props: SlotProps }) {
  return (
    <Wrapper slot={slot} state="error" props={props}>
      <div
        data-testid={`slot-error-${slotTestId(slot)}`}
        lang={props.lang}
        role="alert"
        style={{
          margin: "var(--c-space-8)",
          padding: "var(--c-space-16)",
          borderLeft: "3px solid var(--c-color-seal)",
          background: "var(--c-color-seal-wash)",
          fontSize: "var(--c-text-14)",
        }}
      >
        {SLOT_FAILED[props.lang]}
      </div>
    </Wrapper>
  );
}

class SlotBoundary extends Component<{ slot: SlotId; props: SlotProps; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    console.error(`[cindia shell] slot ${this.props.slot} failed:`, error);
  }

  render() {
    if (this.state.failed) return <SlotError slot={this.props.slot} props={this.props.props} />;
    return this.props.children;
  }
}

function renderersFor(slot: SlotId) {
  return {
    filled: (C: ComponentType<SlotProps>, props: SlotProps) => (
      <Wrapper slot={slot} state="filled" props={props}>
        <C {...props} />
      </Wrapper>
    ),
    empty: (props: SlotProps) => <Placeholder slot={slot} props={props} />,
  };
}

const RENDERERS = new Map(SLOT_IDS.map((s) => [s, renderersFor(s)] as const));

/** One lazy component per slot whose feature exists on disk, made once at module load (never during render). */
const LAZY_SLOTS = new Map(SLOT_IDS.filter(slotHasFeature).map((s) => [s, lazySlot(s, RENDERERS.get(s)!)] as const));

/**
 * The slot's content. Its component is picked once, when it mounts: the feature's own component when
 * the feature has already loaded, so it renders in the same commit, or else the lazy one. Keeping
 * the pick for the slot's life means a feature never remounts when its load finishes.
 */
function SlotBody({ slot, props, Lazy }: { slot: SlotId; props: SlotProps; Lazy: ComponentType<SlotProps> }) {
  const [Type] = useState<ComponentType<SlotProps>>(() => readySlot(slot, RENDERERS.get(slot)!) ?? Lazy);
  return <Suspense fallback={<Placeholder slot={slot} props={props} loading />}>{createElement(Type, props)}</Suspense>;
}

export interface SlotComponentProps extends SlotProps {
  slot: SlotId;
}

/** A slot with the props given, forwarded whole to its feature. */
export function Slot({ slot, ...props }: SlotComponentProps) {
  const Lazy = LAZY_SLOTS.get(slot);
  if (!Lazy) return <Placeholder slot={slot} props={props} />;
  return (
    <SlotBoundary key={slot} slot={slot} props={props}>
      <SlotBody slot={slot} props={props} Lazy={Lazy} />
    </SlotBoundary>
  );
}

/** A slot whose props come from the page it sits on, through slotProps(). */
export function SlotFor({ slot, ctx }: { slot: SlotId; ctx: SlotContext }) {
  return <Slot slot={slot} {...slotProps(slot, ctx)} />;
}
