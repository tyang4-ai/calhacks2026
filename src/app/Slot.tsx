// One slot: the feature that fills it, inside its own error boundary and Suspense, or the empty
// placeholder with its slot- test ID. The wrapper carries data-slot and data-slot-state for the
// shell's own smoke test.
import { Component, createElement, Suspense, type ComponentType, type ReactNode } from "react";
import { SLOT_IDS, slotTestId, type SlotId, type SlotProps } from "../core/featureTypes";
import { lazySlot, slotHasFeature } from "./featureLoader";
import { PLACEHOLDER_NOTE, SLOT_FAILED, SLOT_LABELS } from "./strings";

type SlotState = "empty" | "filled" | "error";

function Wrapper({ slot, state, loading, children }: { slot: SlotId; state: SlotState; loading?: boolean; children: ReactNode }) {
  return (
    <div
      className="cindia-slot"
      data-slot={slot}
      data-slot-state={state}
      data-slot-loading={loading ? "true" : undefined}
      style={{ height: "100%", minHeight: 0, minWidth: 0, display: "flex", flexDirection: "column" }}
    >
      {children}
    </div>
  );
}

function Placeholder({ slot, lang, loading }: { slot: SlotId; lang: "en" | "zh"; loading?: boolean }) {
  const label = SLOT_LABELS[slot];
  return (
    <Wrapper slot={slot} state="empty" loading={loading}>
      <div
        data-testid={`slot-${slotTestId(slot)}`}
        lang={lang}
        style={{
          flex: 1,
          minHeight: 120,
          border: "1px dashed var(--c-color-line)",
          borderRadius: "var(--c-radius-panel)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--c-space-8)",
          padding: "var(--c-space-24)",
          color: "var(--c-color-ink-soft)",
          textAlign: "center",
          fontSize: "var(--c-text-16)",
          margin: "var(--c-space-8)",
        }}
      >
        <span>{label[lang]}</span>
        <span style={{ fontSize: "var(--c-text-14)" }}>{PLACEHOLDER_NOTE[lang]}</span>
      </div>
    </Wrapper>
  );
}

function SlotError({ slot, lang }: { slot: SlotId; lang: "en" | "zh" }) {
  return (
    <Wrapper slot={slot} state="error">
      <div
        data-testid={`slot-error-${slotTestId(slot)}`}
        lang={lang}
        role="alert"
        style={{
          margin: "var(--c-space-8)",
          padding: "var(--c-space-16)",
          borderLeft: "3px solid var(--c-color-seal)",
          background: "var(--c-color-seal-wash)",
          fontSize: "var(--c-text-14)",
        }}
      >
        {SLOT_FAILED[lang]}
      </div>
    </Wrapper>
  );
}

class SlotBoundary extends Component<{ slot: SlotId; lang: "en" | "zh"; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    console.error(`[cindia shell] slot ${this.props.slot} failed:`, error);
  }

  render() {
    if (this.state.failed) return <SlotError slot={this.props.slot} lang={this.props.lang} />;
    return this.props.children;
  }
}

function renderersFor(slot: SlotId) {
  return {
    filled: (C: ComponentType<SlotProps>, props: SlotProps) => (
      <Wrapper slot={slot} state="filled">
        <C surface={props.surface} lang={props.lang} makerId={props.makerId} refId={props.refId} />
      </Wrapper>
    ),
    empty: (props: SlotProps) => <Placeholder slot={slot} lang={props.lang} />,
  };
}

/** One lazy component per slot whose feature exists on disk, made once at module load (never during render). */
const LAZY_SLOTS = new Map(SLOT_IDS.filter(slotHasFeature).map((s) => [s, lazySlot(s, renderersFor(s))] as const));

export interface SlotComponentProps extends SlotProps {
  slot: SlotId;
}

export function Slot({ slot, surface, lang, makerId, refId }: SlotComponentProps) {
  const Lazy = LAZY_SLOTS.get(slot);
  if (!Lazy) return <Placeholder slot={slot} lang={lang} />;
  return (
    <SlotBoundary key={slot} slot={slot} lang={lang}>
      <Suspense fallback={<Placeholder slot={slot} lang={lang} loading />}>
        {createElement(Lazy, { surface, lang, makerId, refId })}
      </Suspense>
    </SlotBoundary>
  );
}
