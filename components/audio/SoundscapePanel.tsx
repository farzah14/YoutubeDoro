"use client";

import { useState } from "react";
import { SOUNDSCAPE_CATALOG, type SoundCategory } from "@/lib/soundscapes";
import type { SoundscapeController } from "@/hooks/useSoundscape";
import { MusicIcon, PauseIcon, PlayIcon, RotateCcwIcon } from "../icons";

type SoundTab = "sounds" | "my-music" | "library";

const presets = [
  { name: "Rainy Desk", emoji: "🌧️", ids: ["rain", "pink-noise"] },
  { name: "Cabin Fire", emoji: "🔥", ids: ["campfire", "wind", "brown-noise"] },
  { name: "Deep Focus", emoji: "🟤", ids: ["brown-noise", "pink-noise"] },
];

export function SoundscapePanel({
  soundscape,
  onOpenMusic,
}: {
  soundscape: SoundscapeController;
  onOpenMusic: () => void;
}) {
  const [tab, setTab] = useState<SoundTab>("sounds");
  const [category, setCategory] = useState<SoundCategory | "All">("All");
  const visibleSounds = category === "All"
    ? SOUNDSCAPE_CATALOG
    : SOUNDSCAPE_CATALOG.filter((sound) => sound.category === category);

  return (
    <div className="audio-panel soundscape-panel">
      <div className="audio-panel__topline">
        <div><p className="eyebrow">Soundscape</p><h3>{soundscape.mix.length} / 5 layers</h3></div>
        <span className="audio-panel__status"><span className={`audio-panel__status-dot ${!soundscape.paused && soundscape.mix.length ? "audio-panel__status-dot--live" : ""}`} />{soundscape.paused ? "Paused" : "Playing"}</span>
      </div>

      <div className="audio-panel__tabs" role="tablist" aria-label="Sound sources">
        {([["sounds", "Sounds"], ["my-music", "My Music"], ["library", "Playlist Library"]] as const).map(([value, label]) => (
          <button key={value} type="button" role="tab" aria-selected={tab === value} className={`audio-panel__tab ${tab === value ? "audio-panel__tab--active" : ""}`} onClick={() => setTab(value)}>{label}</button>
        ))}
      </div>

      {tab === "sounds" && (
        <>
          <div className="soundscape-master">
            <button type="button" className="audio-panel__primary" onClick={soundscape.paused ? soundscape.resume : soundscape.pause} disabled={!soundscape.mix.length}>{soundscape.paused ? <PlayIcon /> : <PauseIcon />}{soundscape.paused ? "Resume mix" : "Pause mix"}</button>
            <button type="button" className="audio-panel__mute" onClick={soundscape.restart} disabled={!soundscape.mix.length} aria-label="Restart soundscape"><RotateCcwIcon /></button>
          </div>
          <div className="soundscape-categories" aria-label="Sound categories">
            {(["All", "Nature", "Cozy", "Noise"] as const).map((value) => <button key={value} type="button" aria-pressed={category === value} onClick={() => setCategory(value)}>{value}</button>)}
          </div>
          <div className="soundscape-grid">
            {visibleSounds.map((sound) => {
              const layer = soundscape.mix.find((item) => item.id === sound.id);
              const atLimit = soundscape.mix.length >= 5 && !layer;
              return (
                <article
                  key={sound.id}
                  className="soundscape-sound"
                  data-active={Boolean(layer) || undefined}
                  data-category={sound.category.toLowerCase()}
                >
                  <button
                    type="button"
                    className="soundscape-sound__toggle"
                    onClick={() => soundscape.toggleLayer(sound.id)}
                    disabled={atLimit}
                    aria-pressed={Boolean(layer)}
                  >
                    <span className="soundscape-sound__icon" aria-hidden="true">{sound.emoji}</span>
                    <span className="soundscape-sound__copy">
                      <strong>{sound.label}</strong>
                      <small>{sound.category}</small>
                    </span>
                    <span className="soundscape-sound__state">
                      <span className="soundscape-sound__state-dot" aria-hidden="true" />
                      {layer ? "Active" : atLimit ? "Full" : "Add"}
                    </span>
                  </button>
                  {layer && (
                    <label className="soundscape-sound__volume">
                      <span className="sr-only">{sound.label} volume</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={layer.volume}
                        onChange={(event) => soundscape.setVolume(sound.id, Number(event.target.value))}
                      />
                      <output>{layer.volume}%</output>
                    </label>
                  )}
                </article>
              );
            })}
          </div>
          {soundscape.mix.length >= 5 && <p className="audio-panel__hint">Five layers active. Remove one to add another.</p>}
        </>
      )}

      {tab === "my-music" && (
        <div className="audio-panel__empty-state"><MusicIcon /><h4>Your music has its own persistent player.</h4><p>Open Music to add provider URLs or choose a station. It can play alongside this soundscape.</p><button type="button" className="audio-panel__primary" onClick={onOpenMusic}>Open Music</button></div>
      )}

      {tab === "library" && (
        <div className="soundscape-presets">
          {presets.map((preset) => <button key={preset.name} type="button" onClick={() => { void soundscape.applyPreset(preset.ids); setTab("sounds"); }}><span>{preset.emoji}</span><strong>{preset.name}</strong><small>{preset.ids.length} layers</small></button>)}
        </div>
      )}
    </div>
  );
}
