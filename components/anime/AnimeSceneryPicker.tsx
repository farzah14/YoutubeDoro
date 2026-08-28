"use client";

import { useState, useRef, useEffect } from "react";
import { ANIME_SCENERIES, AnimeScenery } from "@/lib/animeThemes";
import { Button } from "../ui/Button";
import { ChevronDownIcon, CheckIcon } from "../icons";

interface AnimeSceneryPickerProps {
  currentSceneryId: string;
  onSelectScenery: (id: string) => void;
  particlesEnabled: boolean;
  onToggleParticles: () => void;
}

export function AnimeSceneryPicker({
  currentSceneryId,
  onSelectScenery,
  particlesEnabled,
  onToggleParticles,
}: AnimeSceneryPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const currentScenery: AnimeScenery =
    ANIME_SCENERIES.find((s) => s.id === currentSceneryId) || ANIME_SCENERIES[0];

  // Close popup on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen((prev) => !prev)}
        className="h-8 gap-2 bg-surface/80 backdrop-blur-md border-border-subtle hover:border-accent/40 shadow-sm"
        title="Change Anime Scenery & Ambient Atmosphere"
      >
        <span className="text-xs">🌄</span>
        <span className="text-xs font-medium hidden md:inline truncate max-w-[120px]">
          {currentScenery.name}
        </span>
        <ChevronDownIcon className="h-3.5 w-3.5 text-text-muted" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-surface/95 backdrop-blur-2xl border border-border-subtle rounded-2xl shadow-2xl z-50 p-4 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2.5">
            <div>
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span>🎨</span> Anime Scenery & Atmosphere
              </div>
              <div className="text-[10px] text-text-muted">スタジオジブリ・ロフィの風景</div>
            </div>

            <button
              type="button"
              onClick={onToggleParticles}
              className={`px-2 py-1 rounded-full text-[10px] font-medium border transition-colors ${
                particlesEnabled
                  ? "bg-accent/15 border-accent/40 text-foreground"
                  : "bg-surface border-border-subtle text-text-muted"
              }`}
              title="Toggle floating particles (Sakura, Rain, Stars)"
            >
              Particles: {particlesEnabled ? "ON ✨" : "OFF"}
            </button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {ANIME_SCENERIES.map((scenery) => {
              const isSelected = scenery.id === currentSceneryId;
              return (
                <button
                  key={scenery.id}
                  type="button"
                  onClick={() => {
                    onSelectScenery(scenery.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-all border ${
                    isSelected
                      ? "bg-accent/15 border-accent/60 shadow-sm ring-1 ring-accent/30"
                      : "bg-surface/50 hover:bg-surface-hover/80 border-border-subtle"
                  }`}
                >
                  <div
                    className="w-12 h-12 rounded-lg bg-cover bg-center shrink-0 border border-border-subtle/60 shadow-inner"
                    style={{ backgroundImage: `url(${scenery.imageUrl})` }}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-xs text-foreground truncate">
                        {scenery.name}
                      </div>
                      <span className="text-[10px] font-mono text-text-muted shrink-0">
                        {scenery.jpName}
                      </span>
                    </div>
                    <div className="text-[10px] text-text-muted truncate mt-0.5">
                      {scenery.description}
                    </div>
                  </div>

                  {isSelected && (
                    <span className="text-accent shrink-0">
                      <CheckIcon className="w-4 h-4" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
