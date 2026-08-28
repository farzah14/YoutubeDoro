"use client";

import { useState } from "react";
import type { BrowserMigrationExport } from "@/lib/browserMigration";
import { trackerApi } from "@/lib/trackerApi";
import { Modal } from "../ui/Modal";

const dismissedPrefix = "ytdoro:cloud-migration-dismissed:";
const completedPrefix = "ytdoro:cloud-migration-completed:";

interface MigrationPromptProps {
  data: BrowserMigrationExport;
  onCancel: () => void;
  onImported: () => void;
}

export function MigrationPrompt({ data, onCancel, onImported }: MigrationPromptProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const cancel = () => {
    window.localStorage.setItem(`${dismissedPrefix}${data.migrationKey}`, "1");
    onCancel();
  };

  const importData = async () => {
    setBusy(true);
    setError("");
    try {
      await trackerApi.migrate(data);
      window.localStorage.setItem(`${completedPrefix}${data.migrationKey}`, "1");
      onImported();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not import browser data.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={cancel} title="Move browser tracker data" className="migration-modal">
      <section className="migration-prompt" aria-labelledby="migration-title">
        <p className="eyebrow">One-time browser migration</p>
        <h3 id="migration-title">Keep your old tracker record.</h3>
        <p>Import browser tracker data into this account. Existing cloud data stays unchanged, and the original browser copy remains as a backup.</p>
        <ul>
          <li>{data.summary.tasks} task{data.summary.tasks === 1 ? "" : "s"} and {data.summary.subtasks} subtask{data.summary.subtasks === 1 ? "" : "s"}</li>
          <li>{data.summary.sessions} session summar{data.summary.sessions === 1 ? "y" : "ies"}</li>
          <li>{data.summary.notes} note{data.summary.notes === 1 ? "" : "s"}</li>
        </ul>
        <p className="migration-prompt__fineprint">This imports browser tracker data only. It leaves themes, music, and appearance preferences local.</p>
        {error && <p className="history-row__error" role="alert">{error}</p>}
        <footer className="migration-prompt__actions"><button type="button" className="history-clear" onClick={cancel} disabled={busy}>Cancel</button><button type="button" className="migration-import" onClick={() => { void importData(); }} disabled={busy}>{busy ? "Importing…" : "Import browser data"}</button></footer>
      </section>
    </Modal>
  );
}

export function isMigrationSuppressed(migrationKey: string) {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(`${dismissedPrefix}${migrationKey}`) === "1"
    || window.localStorage.getItem(`${completedPrefix}${migrationKey}`) === "1";
}
