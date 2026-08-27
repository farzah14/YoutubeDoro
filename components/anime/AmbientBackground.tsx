"use client";

import { CozyAnimeTheme } from "@/types/theme";
import { COZY_THEMES } from "@/lib/themeConfig";

interface AmbientBackgroundProps {
  theme: CozyAnimeTheme;
}

export function AmbientBackground({ theme }: AmbientBackgroundProps) {
  const currentConfig = COZY_THEMES[theme] ?? COZY_THEMES["night-study"];

  return (
    <div className={`ambient-background ambient-${theme}`} aria-hidden="true">
      <div
        className="ambient-scene"
        style={{ backgroundImage: `url(${currentConfig.backgroundUrl})` }}
      />
      <div className="ambient-clouds" />
      <div className="ambient-stars" />
      <div className="ambient-rain" />
      <div className="ambient-dust" />
      <div className="ambient-overlay" />
    </div>
  );
}
