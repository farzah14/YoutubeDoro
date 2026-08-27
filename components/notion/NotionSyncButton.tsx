"use client";

import { NotionSyncState } from "@/types";

interface NotionSyncButtonProps {
  syncState: NotionSyncState;
  onSync: () => void;
  onOpenSettings: () => void;
}

export function NotionSyncButton({
  syncState,
  onSync,
  onOpenSettings,
}: NotionSyncButtonProps) {
  const { status, connected, lastSync } = syncState;

  const formatLastSync = (iso: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString();
  };

  if (!connected) {
    return (
      <button
        onClick={onOpenSettings}
        className="group flex h-9 items-center gap-2 rounded-lg border border-border-subtle bg-surface px-3 text-xs text-text-secondary transition-colors duration-150 hover:border-border-focus hover:bg-surface-hover hover:text-foreground"
        title="Connect to Notion"
        aria-label="Connect to Notion"
      >
        <NotionIcon className="h-4 w-4 opacity-60 transition-opacity group-hover:opacity-100" />
        <span className="hidden sm:inline">Connect Notion</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {/* Sync Button */}
      <button
        onClick={onSync}
        disabled={status === "syncing"}
        className={`group flex h-9 items-center gap-2 rounded-lg border px-3 text-xs transition-colors duration-150 ${
          status === "syncing"
            ? "cursor-wait border-border-focus/50 bg-surface-secondary text-accent"
            : status === "success"
              ? "border-success/50 bg-surface-secondary text-success"
              : status === "error"
                ? "border-danger/60 bg-surface-secondary text-danger hover:border-danger"
                : "border-border-subtle bg-surface text-text-secondary hover:border-border-focus hover:bg-surface-hover hover:text-foreground"
        }`}
        title={
          status === "syncing"
            ? "Syncing..."
            : status === "error"
              ? syncState.error || "Sync error"
              : lastSync
                ? `Last synced: ${formatLastSync(lastSync)}`
              : "Sync to Notion"
        }
        aria-label={
          status === "error"
            ? "Notion sync error. Open settings for details."
            : status === "syncing"
              ? "Syncing to Notion"
              : status === "success"
                ? "Synced to Notion. Sync again"
                : "Sync to Notion"
        }
      >
        <span className={`inline-flex ${status === "syncing" ? "animate-spin" : ""}`} aria-hidden="true">
          {status === "success" ? (
            <CheckIcon className="w-4 h-4" />
          ) : status === "error" ? (
            <ErrorIcon className="w-4 h-4" />
          ) : (
            <SyncIcon className="w-4 h-4" />
          )}
        </span>

        <span className="hidden sm:inline">
          {status === "syncing"
            ? "Syncing"
            : status === "success"
              ? "Synced"
              : status === "error"
                ? "Error"
                : "Sync"}
        </span>

      </button>

      {/* Settings gear */}
      <button
        onClick={onOpenSettings}
        className="h-9 w-9 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        title="Notion Settings"
        aria-label="Open Notion settings"
      >
        <GearIcon className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

// ── Inline SVG Icons ──

function NotionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L18.58 2.444c-.42-.327-.98-.7-2.055-.607L3.48 2.974c-.466.046-.56.28-.374.466l1.353.768zm.793 3.313v13.894c0 .746.373 1.026 1.213.98l14.523-.84c.84-.046.933-.56.933-1.166V6.474c0-.606-.233-.933-.746-.886l-15.177.886c-.56.047-.746.327-.746.887zm14.337.42c.093.42 0 .84-.42.886l-.7.14v10.264c-.606.327-1.166.514-1.633.514-.746 0-.933-.234-1.493-.933l-4.572-7.186v6.953l1.446.327s0 .84-1.166.84l-3.22.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.093-.42.14-1.026.793-1.073l3.453-.233 4.76 7.279V9.107l-1.213-.14c-.093-.513.28-.886.746-.933l3.227-.093z" />
    </svg>
  );
}

function SyncIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 8a5.5 5.5 0 0 1 9.23-4.04" />
      <path d="M13.5 8a5.5 5.5 0 0 1-9.23 4.04" />
      <path d="M11 2.5L12 4l1.5-.5" />
      <path d="M5 13.5L4 12l-1.5.5" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 8.5l3 3 6-6.5" />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v4" />
      <circle cx="8" cy="11.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2" />
      <path d="M6.82 2.35a1 1 0 0 1 2.36 0l.1.56a1 1 0 0 0 1.47.6l.47-.3a1 1 0 0 1 1.36 1.36l-.3.47a1 1 0 0 0 .6 1.47l.56.1a1 1 0 0 1 0 2.36l-.56.1a1 1 0 0 0-.6 1.47l.3.47a1 1 0 0 1-1.36 1.36l-.47-.3a1 1 0 0 0-1.47.6l-.1.56a1 1 0 0 1-2.36 0l-.1-.56a1 1 0 0 0-1.47-.6l-.47.3a1 1 0 0 1-1.36-1.36l.3-.47a1 1 0 0 0-.6-1.47l-.56-.1a1 1 0 0 1 0-2.36l.56-.1a1 1 0 0 0 .6-1.47l-.3-.47a1 1 0 0 1 1.36-1.36l.47.3a1 1 0 0 0 1.47-.6l.1-.56z" />
    </svg>
  );
}
