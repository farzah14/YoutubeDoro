import { Button } from "../ui/Button";
import { BookIcon, SettingsIcon } from "../icons";
import { formatMMSS } from "@/lib/time";
import { Badge } from "../ui/Badge";
import { LoFiPlayer } from "../audio/LoFiPlayer";
import { ThemeToggle } from "../ui/ThemeToggle";
import { NotionSyncButton } from "../notion/NotionSyncButton";
import type { NotionSyncState } from "@/types";

interface HeaderProps {
  today: string;
  totalLearnSec: number;
  totalRestSec: number;
  onOpenNotes: () => void;
  onOpenSettings?: () => void;
  // Notion props
  notionSyncState?: NotionSyncState;
  onNotionSync?: () => void;
  onNotionOpenSettings?: () => void;
}

export function Header({
  today,
  totalLearnSec,
  totalRestSec,
  onOpenNotes,
  onOpenSettings,
  notionSyncState,
  onNotionSync,
  onNotionOpenSettings,
}: HeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-8 pt-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">YoutubeDoro</h1>
        <p className="text-sm text-text-muted mt-1">Focus. Learn. Rest.</p>
      </div>

      <div className="flex items-center gap-3">
        <Badge variant="outline" className="px-3 py-1 font-mono text-text-secondary hidden sm:inline-flex">
          {today || "Loading..."}
        </Badge>
        
        <div className="flex h-8 items-center rounded-md border border-border-subtle bg-surface px-3 font-mono text-xs shadow-sm">
          <span className="text-accent font-medium">{formatMMSS(totalLearnSec)}</span>
          <span className="mx-2 text-border-subtle">|</span>
          <span className="text-text-secondary">{formatMMSS(totalRestSec)}</span>
        </div>

        {/* Notion Sync Button */}
        {notionSyncState && onNotionSync && onNotionOpenSettings && (
          <NotionSyncButton
            syncState={notionSyncState}
            onSync={onNotionSync}
            onOpenSettings={onNotionOpenSettings}
          />
        )}

        <ThemeToggle />
        <LoFiPlayer />

        <Button variant="secondary" size="icon" onClick={onOpenNotes} title="Daily Notes (Shortcut: N)">
          <BookIcon className="h-4 w-4 text-foreground" />
        </Button>
        
        {onOpenSettings && (
          <Button variant="ghost" size="icon" onClick={onOpenSettings} title="Settings">
            <SettingsIcon className="h-4 w-4" />
          </Button>
        )}
      </div>
    </header>
  );
}
