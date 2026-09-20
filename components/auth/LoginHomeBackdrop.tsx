"use client";

import { useLocalStorage } from "@/hooks/useLocalStorage";
import { KEYS } from "@/lib/constants";
import { DEFAULT_THEME, THEME_ORDER } from "@/lib/themeConfig";
import type { CozyAnimeTheme } from "@/types/theme";
import type { ThemeSlot, WorkspaceMode, WorkspacePanel } from "@/types/workspace";
import { AmbientBackground } from "../anime/AmbientBackground";
import { Header } from "../layout/Header";
import { HomeHero } from "../layout/HomeHero";
import { WorkspaceDock } from "../layout/WorkspaceDock";

const defaultThemeSlots: Record<ThemeSlot, string | null> = { home: null, focus: null };
const defaultThemeOverlays: Record<ThemeSlot, number> = { home: 42, focus: 42 };

const noopModeChange = (_mode: WorkspaceMode) => {};
const noopPanelToggle = (_panel: WorkspacePanel) => {};

function normalizeTheme(value: CozyAnimeTheme, fallback: CozyAnimeTheme): CozyAnimeTheme {
  return THEME_ORDER.includes(value) ? value : fallback;
}

export function LoginHomeBackdrop() {
  const [legacyTheme] = useLocalStorage<CozyAnimeTheme>(KEYS.theme, DEFAULT_THEME);
  const [homeTheme] = useLocalStorage<CozyAnimeTheme>(KEYS.themeBySlot("home"), legacyTheme);
  const [themeSlots] = useLocalStorage<Record<ThemeSlot, string | null>>(KEYS.themeSlots, defaultThemeSlots);
  const [themeOverlays] = useLocalStorage<Record<ThemeSlot, number>>(KEYS.themeSlots + ":overlay", defaultThemeOverlays);
  const [use24Hour] = useLocalStorage(KEYS.clock24Hour, false);
  const [showSeconds] = useLocalStorage(KEYS.clockShowSeconds, false);
  const [dashboardName] = useLocalStorage(KEYS.dashboardName, "");
  const [greetingStyle] = useLocalStorage<"dynamic" | "generic" | "hidden">(KEYS.greetingStyle, "dynamic");
  const theme = normalizeTheme(homeTheme, normalizeTheme(legacyTheme, DEFAULT_THEME));
  const customThemeId = themeSlots.home;
  const overlay = Number.isFinite(themeOverlays.home) ? themeOverlays.home : 42;

  return (
    <div className="auth-home-backdrop" aria-hidden="true">
      <div className="auth-home-backdrop__preview" inert>
        <AmbientBackground
          key={customThemeId ?? "built-in"}
          theme={theme}
          customThemeId={customThemeId}
          overlay={overlay}
        />
        <div className="workspace-scene relative z-10 flex min-h-0 flex-1 flex-col px-5 py-5 sm:px-8 sm:py-7">
          <Header />
          <HomeHero
            use24Hour={use24Hour}
            showSeconds={showSeconds}
            name={dashboardName}
            greetingStyle={greetingStyle}
          />
          <section className="auth-home-preview__timer" aria-hidden="true">
            <p>Focus timer</p>
            <strong>25:00</strong>
            <button type="button" disabled>Start focus</button>
          </section>
        </div>
        <WorkspaceDock
          mode="home"
          openPanel={null}
          onModeChange={noopModeChange}
          onPanelToggle={noopPanelToggle}
        />
      </div>
      <div className="auth-home-backdrop__veil" />
    </div>
  );
}
