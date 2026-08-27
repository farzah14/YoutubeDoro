"use client";

import { BookIcon, FlameIcon, PlayIcon, TargetIcon } from "../icons";

export type MobileTab = "focus" | "tasks" | "stats";

interface MobileNavProps {
  activeTab: MobileTab;
  onSelectTab: (tab: MobileTab) => void;
  onOpenNotes: () => void;
}

const tabClass = (active: boolean) =>
  `flex min-h-11 min-w-16 flex-col items-center justify-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors duration-150 ${
    active ? "bg-accent-soft text-accent" : "text-text-muted hover:bg-surface-hover hover:text-foreground"
  }`;

export function MobileNav({ activeTab, onSelectTab, onOpenNotes }: MobileNavProps) {
  return (
    <nav
      aria-label="Mobile workspace navigation"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_30px_rgba(2,9,18,0.24)] md:hidden"
    >
      <div className="mx-auto flex max-w-md items-center justify-around gap-1">
        <button
          type="button"
          onClick={() => onSelectTab("focus")}
          className={tabClass(activeTab === "focus")}
          aria-current={activeTab === "focus" ? "page" : undefined}
        >
          <PlayIcon className="h-4 w-4" aria-hidden="true" />
          <span>Focus</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab("tasks")}
          className={tabClass(activeTab === "tasks")}
          aria-current={activeTab === "tasks" ? "page" : undefined}
        >
          <TargetIcon className="h-4 w-4" aria-hidden="true" />
          <span>Tasks</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab("stats")}
          className={tabClass(activeTab === "stats")}
          aria-current={activeTab === "stats" ? "page" : undefined}
        >
          <FlameIcon className="h-4 w-4" aria-hidden="true" />
          <span>Stats</span>
        </button>

        <button
          type="button"
          onClick={onOpenNotes}
          className={tabClass(false)}
          aria-label="Open daily notes and scratchpad"
        >
          <BookIcon className="h-4 w-4" aria-hidden="true" />
          <span>Notes</span>
        </button>
      </div>
    </nav>
  );
}
