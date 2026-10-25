// The project add-on at checkout (M-buyer T4): the community's first project, its title and its
// add-on amount through Money, with an on and off switch that starts off (C-10). L7 sits inside it,
// before any click. The whole row is the switch's label, so a click anywhere on it toggles it,
// unless it's locked (the public build, or once this piece's checkout started).
import type { Project } from "../../core/types";
import { Money } from "../../ui/Money";
import { fill, onScreen, page, tr, type Lang } from "./strings";

export interface ProjectAddOnProps {
  lang: Lang;
  project: Project;
  on: boolean;
  locked: boolean;
  onChange: (on: boolean) => void;
}

export function ProjectAddOn({ lang, project, on, locked, onChange }: ProjectAddOnProps) {
  return (
    <label
      data-testid="buyer-project-addon"
      data-state={on ? "on" : "off"}
      data-project-id={project.id}
      className={`flex gap-3 rounded-control border border-line px-3 py-2 ${locked ? "cursor-default" : "cursor-pointer"}`}
    >
      <input
        type="checkbox"
        role="switch"
        aria-checked={on}
        checked={on}
        disabled={locked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-[var(--c-color-jade)]"
      />
      <span className="flex min-w-0 flex-col text-sm leading-5">
        <span className="text-base font-semibold text-ink">
          {fill(tr(page.addOn, lang), { amount: <Money cents={project.addOnCents} />, project: tr(project.title, lang) })}
        </span>
        <span className="text-ink-soft">{tr(page.addOnFund, lang)}</span>
        <span data-testid="buyer-addon-note" className="text-ink-soft">
          {tr(onScreen.L7, lang)}
        </span>
      </span>
    </label>
  );
}
