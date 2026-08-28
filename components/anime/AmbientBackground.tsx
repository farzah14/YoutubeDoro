"use client";

import { CozyAnimeTheme } from "@/types/theme";
import { COZY_THEMES } from "@/lib/themeConfig";
import { getCustomThemeUrl } from "@/lib/customThemeStore";
import { useEffect, useState } from "react";

interface AmbientBackgroundProps {
  theme: CozyAnimeTheme;
  customThemeId?: string | null;
  overlay?: number;
}

export function AmbientBackground({ theme, customThemeId, overlay = 42 }: AmbientBackgroundProps) {
  const currentConfig = COZY_THEMES[theme] ?? COZY_THEMES["night-study"];
  const [customUrl, setCustomUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!customThemeId) {
      return () => { active = false; };
    }
    void getCustomThemeUrl(customThemeId).then((url) => { if (active) setCustomUrl(url); });
    return () => { active = false; };
  }, [customThemeId]);

  useEffect(() => () => { if (customUrl) URL.revokeObjectURL(customUrl); }, [customUrl]);

  return (
    <div className={`ambient-background ambient-${theme}`} aria-hidden="true">
      <div
        className="ambient-scene"
        style={{ backgroundImage: `url(${customUrl ?? currentConfig.backgroundUrl})` }}
      />
      <div className="ambient-clouds" />
      <div className="ambient-stars" />
      <div className="ambient-rain" />
      <div className="ambient-dust" />
      <div className="ambient-overlay" style={{ opacity: Math.min(0.9, Math.max(0, overlay / 100)) }} />
    </div>
  );
}
