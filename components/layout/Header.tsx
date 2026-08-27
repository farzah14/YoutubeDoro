"use client";

import { Button } from "../ui/Button";
import { BookIcon, SettingsIcon } from "../icons";
import { formatMMSS } from "@/lib/time";
import { LoFiPlayer } from "../audio/LoFiPlayer";
import { NotionSyncButton } from "../notion/NotionSyncButton";
import { ThemeSelector } from "../anime/ThemeSelector";
import { CozyAnimeTheme } from "@/types/theme";
import type { NotionSyncState } from "@/types";

interface HeaderProps {
  today: string;
  totalLearnSec: number;
  totalRestSec: number;
  currentTheme: CozyAnimeTheme;
  onSelectTheme: (theme: CozyAnimeTheme) => void;
  onOpenNotes: () => void;
  onOpenSettings?: () => void;
  notionSyncState?: NotionSyncState;
  onNotionSync?: () => void;
  onNotionOpenSettings?: () => void;
}

export function Header({
  today,
  totalLearnSec,
  totalRestSec,
  currentTheme,
  onSelectTheme,
  onOpenNotes,
  onOpenSettings,
  notionSyncState,
  onNotionSync,
  onNotionOpenSettings,
}: HeaderProps) {
  return (
    <header className="relative z-20 flex flex-col gap-4 border-b border-border-subtle/80 pb-5 pt-4 sm:pb-6 md:flex-row md:items-end md:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] border border-accent/50 bg-accent-soft font-mono text-xs font-bold tracking-tight text-accent shadow-sm"
          aria-hidden="true"
        >
          YD
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="truncate text-xl font-black tracking-[-0.045em] text-foreground sm:text-2xl">
              YoutubeDoro
            </h1>
            <p className="eyebrow">Quiet focus room</p>
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            集中 / 休憩 <span className="px-1 text-text-muted">·</span> stay with one small task
          </p>
        </div>
      </div>

      <nav aria-label="Workspace tools" className="flex min-w-0 flex-wrap items-center justify-start gap-2 md:justify-end">
        <div className="hidden h-9 items-center gap-2 rounded-lg border border-border-subtle bg-surface/90 px-3 sm:flex">
          <span className="eyebrow">Today</span>
          <time className="font-mono text-xs font-semibold text-text-secondary" dateTime={today}>
            {today || "Loading..."}
          </time>
        </div>

        <div className="flex h-9 items-center rounded-lg border border-border-subtle bg-surface/90 px-3 font-mono text-xs shadow-sm">
          <span className="text-accent" title="Focused time today">
            {formatMMSS(totalLearnSec)}
          </span>
          <span className="mx-2 text-border-subtle" aria-hidden="true">/</span>
          <span className="text-text-secondary" title="Rest time today">
            {formatMMSS(totalRestSec)}
          </span>
        </div>

        <ThemeSelector currentTheme={currentTheme} onSelectTheme={onSelectTheme} />

        <div className="shrink-0">
          <LoFiPlayer />
        </div>

        {notionSyncState && onNotionSync && onNotionOpenSettings && (
          <NotionSyncButton
            syncState={notionSyncState}
            onSync={onNotionSync}
            onOpenSettings={onNotionOpenSettings}
          />
        )}

        <Button
          variant="secondary"
          size="icon"
          onClick={onOpenNotes}
          title="Open daily notes"
          aria-label="Open daily notes and scratchpad"
          className="h-9 w-9"
        >
          <BookIcon className="h-4 w-4" aria-hidden="true" />
        </Button>

        {onOpenSettings && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenSettings}
            title="Open settings"
            aria-label="Open settings"
            className="h-9 w-9"
          >
            <SettingsIcon className="h-4 w-4 text-text-secondary" aria-hidden="true" />
          </Button>
        )}
      </nav>
    </header>
  );
}
