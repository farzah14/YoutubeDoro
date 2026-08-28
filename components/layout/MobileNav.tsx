"use client";

import { WorkspaceDock } from "./WorkspaceDock";
import type { WorkspaceMode, WorkspacePanel } from "@/types/workspace";

export type MobileTab = "focus" | "tasks" | "stats";

interface MobileNavProps {
  activeTab: MobileTab;
  onSelectTab: (tab: MobileTab) => void;
  onOpenHistory: () => void;
}

export function MobileNav({ activeTab, onSelectTab, onOpenHistory }: MobileNavProps) {
  const mode: WorkspaceMode = activeTab === "focus" ? "focus" : "home";
  const activePanel: WorkspacePanel | null = activeTab === "tasks" ? "tasks" : activeTab === "stats" ? "stats" : null;

  return (
    <WorkspaceDock
      mode={mode}
      openPanel={activePanel}
      onModeChange={(nextMode) => onSelectTab(nextMode === "focus" ? "focus" : "stats")}
      onPanelToggle={(panel) => {
        if (panel === "history") onOpenHistory();
        else if (panel === "tasks" || panel === "stats") onSelectTab(panel);
      }}
    />
  );
}
