"use client";

import { useState, useCallback } from "react";
import { readJSON, writeJSON } from "@/lib/storage";
import { KEYS } from "@/lib/constants";
import { NoteKind, DailyNoteEntry } from "@/types";
import { safeTitle, stableEntryId, sanitizeNotes } from "@/lib/notes";

export function useDailyNotes(day: string) {
  const [notesBump, setNotesBump] = useState(0);

  const getNotes = useCallback(() => {
    if (!day) return [];
    // Access notesBump to re-evaluate when notesBump changes
    void notesBump;
    const raw = readJSON<unknown>(KEYS.notesByDay(day), []);
    return sanitizeNotes(raw);
  }, [day, notesBump]);

  const upsertTitleNote = useCallback((payload: { kind: NoteKind; title: string; addLearn: number; addRest: number }) => {
    if (!day) return;
    const title = safeTitle(payload.title);
    const id = stableEntryId(day, title);

    const list = getNotes();
    const idx = list.findIndex((x) => x.id === id);

    const addL = Math.max(0, Math.floor(payload.addLearn));
    const addR = Math.max(0, Math.floor(payload.addRest));

    if (idx >= 0) {
      const prev = list[idx];
      const next: DailyNoteEntry = {
        ...prev,
        id,
        ts: Date.now(),
        day,
        kind: payload.kind,
        title,
        deltaLearnSec: addL,
        deltaRestSec: addR,
        totalLearnTitleSec: (prev.totalLearnTitleSec || 0) + addL,
        totalRestTitleSec: (prev.totalRestTitleSec || 0) + addR,
      };
      list.splice(idx, 1);
      list.unshift(next);
    } else {
      list.unshift({
        id,
        ts: Date.now(),
        day,
        kind: payload.kind,
        title,
        deltaLearnSec: addL,
        deltaRestSec: addR,
        totalLearnTitleSec: addL,
        totalRestTitleSec: addR,
      });
    }

    writeJSON(KEYS.notesByDay(day), list);
    setNotesBump((v) => v + 1);
  }, [day, getNotes]);

  const clearNotesForDay = useCallback(() => {
    if (!day) return;
    writeJSON(KEYS.notesByDay(day), []);
    setNotesBump((v) => v + 1);
  }, [day]);

  const removeOneNote = useCallback((id: string) => {
    if (!day) return;
    const list = getNotes();
    const next = list.filter((x) => x.id !== id);
    writeJSON(KEYS.notesByDay(day), next);
    setNotesBump((v) => v + 1);
  }, [day, getNotes]);

  return {
    notesBump,
    getNotes,
    upsertTitleNote,
    clearNotesForDay,
    removeOneNote,
  };
}
