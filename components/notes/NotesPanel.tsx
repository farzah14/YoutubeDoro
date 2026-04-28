"use client";

import { useState, useEffect, useTransition } from "react";
import { useDailyNotes } from "@/hooks/useDailyNotes";
import { readNumber } from "@/lib/storage";
import { KEYS } from "@/lib/constants";
import { formatMMSS } from "@/lib/time";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Badge } from "../ui/Badge";
import { NoteEntry } from "./NoteEntry";
import { TrashIcon } from "../icons";

interface NotesPanelProps {
  initialDay: string;
}

export function NotesPanel({ initialDay }: NotesPanelProps) {
  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [learnTotal, setLearnTotal] = useState(0);
  const [restTotal, setRestTotal] = useState(0);

  const { getNotes, clearNotesForDay, removeOneNote, notesBump } = useDailyNotes(selectedDay);
  
  const entries = getNotes();

  useEffect(() => {
    if (!initialDay) return;
    if (selectedDay) return;
    setSelectedDay(initialDay);
  }, [initialDay, selectedDay]);

  useEffect(() => {
    if (!selectedDay) return;
    const learn = readNumber(KEYS.learnByDay(selectedDay));
    const rest = readNumber(KEYS.restByDay(selectedDay)) || readNumber(KEYS.legacyBreakByDay(selectedDay));
    
    setLearnTotal(learn);
    setRestTotal(rest);
  }, [selectedDay, notesBump]);

  function handleRemoveAll() {
    if (!selectedDay || entries.length === 0) return;
    if (window.confirm(`Delete ALL notes for ${selectedDay}?\n(Daily totals & saved topics are kept)`)) {
      clearNotesForDay();
    }
  }

  function handleRemoveOne(id: string) {
    if (window.confirm("Delete this entry?")) {
      removeOneNote(id);
    }
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-secondary">Date</label>
          <Input
            type="date"
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            className="w-auto"
          />
        </div>

        <div className="flex gap-2 pb-1">
          <Badge variant="secondary" className="px-3 py-1.5 font-mono">
            Focus: {formatMMSS(learnTotal)}
          </Badge>
          <Badge variant="secondary" className="px-3 py-1.5 font-mono">
            Rest: {formatMMSS(restTotal)}
          </Badge>
        </div>

        <div className="ml-auto pb-1">
          <Button 
            variant="danger" 
            size="sm" 
            onClick={handleRemoveAll}
            disabled={entries.length === 0}
          >
            <TrashIcon className="mr-2 h-4 w-4" /> Clear All
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground border-b border-border-subtle pb-2">
          Log Entries
        </h3>
        
        {entries.length === 0 ? (
          <div className="py-12 text-center text-sm text-text-muted bg-surface rounded-lg border border-dashed border-border-subtle">
            No activity logged for this date.
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map(entry => (
              <NoteEntry key={entry.id} entry={entry} onRemove={handleRemoveOne} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
