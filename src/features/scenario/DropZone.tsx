// F-scenario T1: the drop zone. Drag and drop or a file picker for a .csv or .json statement.
// It shows the file's name in scenario-file. In scripted mode it never reads, uploads or emits
// anything for a file: scenario-note says reading files comes with the live upgrade and offers the
// sample. In live mode it reads a file of at most 200 KB as text and emits scenario.loaded with
// recordIds: [] and the text as content, built with userEvent() so the registry routes it to
// b05-scenario. A bigger file, or one that isn't .csv or .json, gets a note instead.
import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { emit, useCindia, userEvent } from "../../core";
import { scenarioId } from "../../mock";
import { Button } from "../../ui";
import type { Lang } from "./strings";
import { STRINGS, t } from "./strings";

export interface DropZoneProps {
  lang: Lang;
  /** Requests the sample statement (the same as the panel's "Use the sample statement"). */
  onUseSample: () => void;
}

/** The largest file a live request may carry, matching the content limit in src/core/validate.ts. */
const MAX_BYTES = 200 * 1024;
const ACCEPT = ".csv,.json,text/csv,application/json";

type NoteKey = "scriptedFileNote" | "tooBigNote" | "wrongTypeNote" | "readFailedNote" | "sentNote";

const hiddenInput = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
} as const;

function readable(name: string): boolean {
  return /\.(csv|json)$/i.test(name);
}

export function DropZone({ lang, onUseSample }: DropZoneProps) {
  const mode = useCindia((s) => s.mode);
  const [fileName, setFileName] = useState<string | null>(null);
  const [note, setNote] = useState<NoteKey | null>(null);
  const [active, setActive] = useState(false);
  // Each new file bumps this, so a slow read of an older file can't overwrite the newer note.
  const turn = useRef(0);

  async function take(file: File) {
    turn.current += 1;
    const mine = turn.current;
    setFileName(file.name);
    if (mode !== "live") {
      // Scripted mode: the file is never read, uploaded or sent.
      setNote("scriptedFileNote");
      return;
    }
    if (!readable(file.name)) {
      setNote("wrongTypeNote");
      return;
    }
    if (file.size > MAX_BYTES) {
      setNote("tooBigNote");
      return;
    }
    setNote(null);
    let content: string;
    try {
      content = await file.text();
    } catch {
      if (mine === turn.current) setNote("readFailedNote");
      return;
    }
    if (mine !== turn.current) return;
    if (content.length > MAX_BYTES) {
      setNote("tooBigNote");
      return;
    }
    emit(userEvent("scenario.loaded", { scenarioId, fileName: file.name, recordIds: [], content }));
    setNote("sentNote");
  }

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Clear the input so picking the same file again still fires a change.
    e.target.value = "";
    if (file) void take(file);
  }

  function onDragOver(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (!active) setActive(true);
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void take(file);
  }

  const offersSample = note !== null && note !== "sentNote";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--c-space-8)" }}>
      <label
        data-testid="scenario-dropzone"
        onDragEnter={onDragOver}
        onDragOver={onDragOver}
        onDragLeave={() => setActive(false)}
        onDrop={onDrop}
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--c-space-8)",
          padding: "var(--c-space-24) var(--c-space-16)",
          border: `1px dashed ${active ? "var(--c-color-ink)" : "var(--c-color-line)"}`,
          borderRadius: "var(--c-radius-control)",
          background: active ? "var(--c-color-mat)" : "var(--c-color-paper)",
          color: "var(--c-color-ink-soft)",
          textAlign: "center",
          cursor: "pointer",
          transition: "background var(--c-motion-ui), border-color var(--c-motion-ui)",
        }}
      >
        <input type="file" accept={ACCEPT} aria-label={t(STRINGS.fileInputLabel, lang)} onChange={onPick} style={hiddenInput} />
        <span style={{ color: "var(--c-color-ink)" }}>{t(active ? STRINGS.dropActive : STRINGS.dropPrompt, lang)}</span>
        <span style={{ fontSize: "var(--c-text-14)", textDecoration: "underline" }}>{t(STRINGS.chooseFile, lang)}</span>
      </label>
      {fileName !== null && (
        <div style={{ fontSize: "var(--c-text-14)", color: "var(--c-color-ink-soft)" }}>
          {t(STRINGS.fileLabel, lang)}:{" "}
          <span data-testid="scenario-file" style={{ color: "var(--c-color-ink)", overflowWrap: "anywhere" }}>
            {fileName}
          </span>
        </div>
      )}
      {note !== null && (
        <div
          // The "sent" line is a status, not a note: the results' fallback note may follow it.
          data-testid={note === "sentNote" ? undefined : "scenario-note"}
          role="status"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "var(--c-space-8)",
            fontSize: "var(--c-text-14)",
            color: "var(--c-color-ink)",
          }}
        >
          <span>{t(STRINGS[note], lang)}</span>
          {offersSample && (
            <Button variant="quiet" size="small" onClick={onUseSample}>
              {t(STRINGS.useSample, lang)}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
