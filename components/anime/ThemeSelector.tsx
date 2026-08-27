"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CozyAnimeTheme } from "@/types/theme";
import { COZY_THEMES, THEME_ORDER } from "@/lib/themeConfig";
import { Button } from "../ui/Button";
import { ChevronDownIcon, CheckIcon } from "../icons";

interface ThemeSelectorProps {
  currentTheme: CozyAnimeTheme;
  onSelectTheme: (theme: CozyAnimeTheme) => void;
}

export function ThemeSelector({ currentTheme, onSelectTheme }: ThemeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const activeTheme = COZY_THEMES[currentTheme] ?? COZY_THEMES["night-study"];

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen((previous) => !previous)}
        className="h-9 gap-2 border-border bg-surface text-foreground shadow-sm hover:bg-surface-hover"
        title="Change study atmosphere"
        aria-label={`Change study atmosphere. Current theme: ${activeTheme.name}`}
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-haspopup="menu"
      >
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full border border-foreground/20"
          style={{ backgroundColor: activeTheme.accentColor }}
          aria-hidden="true"
        />
        <span className="hidden max-w-[110px] truncate text-xs font-semibold sm:inline">
          {activeTheme.name}
        </span>
        <ChevronDownIcon className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
      </Button>

      {isOpen && (
        <div
          id={menuId}
          role="menu"
          aria-label="Study atmosphere"
          className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] space-y-2 rounded-xl border border-border bg-surface p-3 shadow-xl"
        >
          <div className="border-b border-border-subtle px-1 pb-3">
            <p className="eyebrow">Study atmosphere</p>
            <p className="mt-1 text-xs text-text-muted">Choose the room that helps you settle in.</p>
          </div>

          <div className="space-y-1.5">
            {THEME_ORDER.map((themeKey) => {
              const theme = COZY_THEMES[themeKey];
              const isSelected = theme.id === currentTheme;

              return (
                <button
                  key={theme.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isSelected}
                  onClick={() => {
                    onSelectTheme(theme.id);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors duration-150 ${
                    isSelected
                      ? "border-border-focus bg-accent-soft"
                      : "border-border-subtle bg-surface-secondary hover:border-border-focus hover:bg-surface-hover"
                  }`}
                >
                  <span
                    className="h-11 w-14 shrink-0 rounded-md border border-border bg-cover bg-center"
                    style={{ backgroundImage: `url(${theme.backgroundUrl})` }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-bold text-foreground">{theme.name}</span>
                      <span className="shrink-0 font-mono text-[10px] text-text-muted">{theme.jpName}</span>
                    </span>
                    <span className="mt-1 block truncate text-[11px] leading-4 text-text-muted">
                      {theme.description}
                    </span>
                  </span>
                  {isSelected && <CheckIcon className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
