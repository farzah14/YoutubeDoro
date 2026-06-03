"use client";

import { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import type { NotionSyncState } from "@/types";

interface NotionSettingsModalProps {
  open: boolean;
  onClose: () => void;
  syncState: NotionSyncState;
  onValidate: (token: string, parentPageId?: string) => Promise<{
    success: boolean;
    user?: { name: string; type: string; avatarUrl: string | null };
    databaseId?: string;
    error?: string;
  }>;
  onDisconnect: () => void;
  onPull: () => Promise<unknown>;
}

export function NotionSettingsModal({
  open,
  onClose,
  syncState,
  onValidate,
  onDisconnect,
  onPull,
}: NotionSettingsModalProps) {
  const [token, setToken] = useState("");
  const [parentPageId, setParentPageId] = useState("");
  const [step, setStep] = useState<"input" | "connecting" | "connected" | "error">(
    syncState.connected ? "connected" : "input"
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [userName, setUserName] = useState("");
  const [pulling, setPulling] = useState(false);

  const handleConnect = async () => {
    if (!token.trim()) {
      setErrorMsg("Please enter your Notion Integration Token");
      return;
    }
    if (!parentPageId.trim()) {
      setErrorMsg("Please enter a Parent Page ID for the database");
      return;
    }

    setStep("connecting");
    setErrorMsg("");

    const result = await onValidate(token.trim(), parentPageId.trim());

    if (result.success) {
      setStep("connected");
      setUserName(result.user?.name || "Notion User");
    } else {
      setStep("error");
      setErrorMsg(result.error || "Connection failed");
    }
  };

  const handleDisconnect = () => {
    onDisconnect();
    setStep("input");
    setToken("");
    setParentPageId("");
    setErrorMsg("");
  };

  const handlePull = async () => {
    setPulling(true);
    try {
      await onPull();
    } finally {
      setPulling(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Notion Integration">
      <div className="space-y-6">
        {/* Status Banner */}
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
            syncState.connected
              ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
              : "bg-surface border-border-subtle text-text-muted"
          }`}
        >
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              syncState.connected
                ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                : "bg-text-muted"
            }`}
          />
          <span className="text-sm font-medium">
            {syncState.connected
              ? `Connected${userName ? ` as ${userName}` : ""}`
              : "Not connected"}
          </span>
          {syncState.lastSync && (
            <span className="ml-auto text-xs text-text-muted">
              Last sync: {new Date(syncState.lastSync).toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Connected View */}
        {(step === "connected" || syncState.connected) && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-surface border border-border-subtle space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Sync Options</h3>
              
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handlePull}
                  disabled={pulling}
                >
                  {pulling ? (
                    <>
                      <span className="animate-spin mr-2">⟳</span> Pulling...
                    </>
                  ) : (
                    "↓ Pull from Notion"
                  )}
                </Button>
              </div>

              <p className="text-xs text-text-muted">
                Data is automatically synced to Notion in real-time whenever you complete or stop a timer session.
              </p>
            </div>

            <Button
              variant="danger"
              size="sm"
              onClick={handleDisconnect}
              className="w-full"
            >
              Disconnect from Notion
            </Button>
          </div>
        )}

        {/* Input View */}
        {step !== "connected" && !syncState.connected && (
          <div className="space-y-5">
            {/* Step-by-step Instructions */}
            <div className="p-4 rounded-lg bg-surface/50 border border-border-subtle space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Setup Instructions</h3>
              <ol className="text-xs text-text-secondary space-y-2 list-decimal list-inside">
                <li>
                  Go to{" "}
                  <a
                    href="https://www.notion.so/my-integrations"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent underline hover:text-accent-hover"
                  >
                    notion.so/my-integrations
                  </a>{" "}
                  and create a new integration
                </li>
                <li>Copy the <strong>Internal Integration Token</strong></li>
                <li>
                  Create a <strong>new page</strong> in your Notion workspace where the database will be created
                </li>
                <li>
                  On that page, click <strong>•••</strong> → <strong>Add connections</strong> → select your integration
                </li>
                <li>
                  Copy the <strong>Page ID</strong> from the page URL:{" "}
                  <code className="text-accent bg-surface px-1 py-0.5 rounded text-[10px]">
                    notion.so/Page-Title-<strong>PAGE_ID_HERE</strong>
                  </code>
                </li>
              </ol>
            </div>

            {/* Token Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">
                Integration Token
              </label>
              <Input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ntn_xxxxxxxxxxxxxxxxxxxxx"
              />
            </div>

            {/* Parent Page ID */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">
                Parent Page ID
              </label>
              <Input
                value={parentPageId}
                onChange={(e) => setParentPageId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
              <p className="text-xs text-text-muted">
                A new database "YoutubeDoro — Study Tracker" will be created under this page.
              </p>
            </div>

            {/* Error Message */}
            {(errorMsg || step === "error") && (
              <div className="px-4 py-3 rounded-lg bg-red-500/5 border border-red-500/20 text-red-400 text-sm">
                {errorMsg}
              </div>
            )}

            {/* Connect Button */}
            <Button
              onClick={handleConnect}
              disabled={step === "connecting"}
              className="w-full"
            >
              {step === "connecting" ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⟳</span> Connecting...
                </span>
              ) : (
                "Connect to Notion"
              )}
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-border-subtle text-xs text-text-muted text-center">
          Your token is sent to the server only for API calls and never stored in the browser.
          <br />
          Configure the token in your <code className="text-accent">.env.local</code> file for persistent use.
        </div>
      </div>
    </Modal>
  );
}
