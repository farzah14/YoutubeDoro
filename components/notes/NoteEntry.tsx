import { DailyNoteEntry } from "@/types";
import { kindLabel, shortId } from "@/lib/notes";
import { formatMMSS } from "@/lib/time";
import { PlayIcon, SquareIcon, CheckIcon, BookIcon, TrashIcon } from "../icons";

interface NoteEntryProps {
  entry: DailyNoteEntry;
  onRemove: (id: string) => void;
}

function getKindIcon(kind: DailyNoteEntry["kind"]) {
  switch (kind) {
    case "learn_start": return <PlayIcon className="h-4 w-4 text-accent" />;
    case "learn_done": return <CheckIcon className="h-4 w-4 text-success" />;
    case "learn_stop": return <SquareIcon className="h-4 w-4 text-warning" />;
    case "rest_done": return <CheckIcon className="h-4 w-4 text-success" />;
    case "rest_stop": return <SquareIcon className="h-4 w-4 text-warning" />;
    case "yt_rest_done": return <CheckIcon className="h-4 w-4 text-success" />;
    case "yt_rest_stop": return <SquareIcon className="h-4 w-4 text-warning" />;
    default: return <BookIcon className="h-4 w-4 text-text-muted" />;
  }
}

export function NoteEntry({ entry, onRemove }: NoteEntryProps) {
  const time = new Date(entry.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const titleText = entry.title?.trim() ? entry.title.trim() : "(Untitled)";

  return (
    <div className="flex items-start gap-4 rounded-lg border border-border-subtle bg-background p-4 transition-colors hover:bg-surface-hover">
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface border border-border-subtle">
        {getKindIcon(entry.kind)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="truncate font-medium text-foreground">{titleText}</h4>
            <div className="mt-1 flex items-center gap-2 text-xs text-text-muted">
              <span>{kindLabel(entry.kind)}</span>
              <span>•</span>
              <span>{time}</span>
              <span>•</span>
              <span className="font-mono opacity-60">{shortId(entry.id)}</span>
            </div>
          </div>

          <button
            onClick={() => onRemove(entry.id)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-danger/10 hover:text-danger transition-colors focus:outline-none focus:ring-2 focus:ring-danger"
            title="Delete Note"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-4 text-xs">
          <div className="flex flex-col gap-1">
            <span className="text-text-muted">Added (This Session)</span>
            <div className="flex gap-2 font-mono text-foreground">
              <span title="Learn">L: {formatMMSS(entry.deltaLearnSec)}</span>
              <span title="Rest">R: {formatMMSS(entry.deltaRestSec)}</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-1">
            <span className="text-text-muted">Total for Topic</span>
            <div className="flex gap-2 font-mono text-foreground">
              <span title="Learn">L: {formatMMSS(entry.totalLearnTitleSec)}</span>
              <span title="Rest">R: {formatMMSS(entry.totalRestTitleSec)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
