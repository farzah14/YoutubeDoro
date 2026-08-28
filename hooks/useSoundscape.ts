"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { KEYS } from "@/lib/constants";
import {
  addSoundLayer,
  sanitizeSoundMix,
  SOUNDSCAPE_CATALOG,
  type SoundMixLayer,
  type SoundRuntime,
} from "@/lib/soundscapes";
import { useLocalStorage } from "./useLocalStorage";

interface RunningLayer extends SoundRuntime {
  gain: GainNode;
}

export function useSoundscape() {
  const [storedMix, setStoredMix] = useLocalStorage<SoundMixLayer[]>(KEYS.soundscapeMix, []);
  const [storedPaused, setStoredPaused] = useLocalStorage(KEYS.soundscapePaused, true);
  const [ready, setReady] = useState(false);
  const contextRef = useRef<AudioContext | null>(null);
  const runningRef = useRef(new Map<string, RunningLayer>());
  const mix = sanitizeSoundMix(storedMix);

  const ensureContext = useCallback(async () => {
    const context = contextRef.current ?? new AudioContext();
    contextRef.current = context;
    if (context.state !== "running") await context.resume();
    setReady(true);
    return context;
  }, []);

  const stopLayer = useCallback((id: string) => {
    const running = runningRef.current.get(id);
    running?.stop();
    running?.gain.disconnect();
    runningRef.current.delete(id);
  }, []);

  const startLayer = useCallback((context: AudioContext, layer: SoundMixLayer) => {
    if (runningRef.current.has(layer.id)) return;
    const sound = SOUNDSCAPE_CATALOG.find((item) => item.id === layer.id);
    if (!sound) return;
    const runtime = sound.create(context);
    const gain = context.createGain();
    gain.gain.value = layer.volume / 100;
    runtime.node.connect(gain);
    gain.connect(context.destination);
    runningRef.current.set(layer.id, { ...runtime, gain });
  }, []);

  const resume = useCallback(async () => {
    const context = await ensureContext();
    mix.forEach((layer) => startLayer(context, layer));
    setStoredPaused(false);
  }, [ensureContext, mix, setStoredPaused, startLayer]);

  const pause = useCallback(async () => {
    if (contextRef.current?.state === "running") await contextRef.current.suspend();
    setStoredPaused(true);
  }, [setStoredPaused]);

  const toggleLayer = useCallback(async (id: string) => {
    if (mix.some((layer) => layer.id === id)) {
      stopLayer(id);
      setStoredMix(mix.filter((layer) => layer.id !== id));
      return;
    }
    const next = addSoundLayer(mix, id);
    if (next === mix) return;
    const context = await ensureContext();
    mix.forEach((layer) => startLayer(context, layer));
    startLayer(context, next[next.length - 1]);
    setStoredMix(next);
    setStoredPaused(false);
  }, [ensureContext, mix, setStoredMix, setStoredPaused, startLayer, stopLayer]);

  const setVolume = useCallback((id: string, volume: number) => {
    const safe = Math.min(100, Math.max(0, Math.round(volume)));
    const running = runningRef.current.get(id);
    if (running && contextRef.current) running.gain.gain.setTargetAtTime(safe / 100, contextRef.current.currentTime, 0.02);
    setStoredMix(mix.map((layer) => layer.id === id ? { ...layer, volume: safe } : layer));
  }, [mix, setStoredMix]);

  const restart = useCallback(async () => {
    const context = await ensureContext();
    [...runningRef.current.keys()].forEach(stopLayer);
    mix.forEach((layer) => startLayer(context, layer));
    setStoredPaused(false);
  }, [ensureContext, mix, setStoredPaused, startLayer, stopLayer]);

  const applyPreset = useCallback(async (ids: string[]) => {
    const next = ids.slice(0, 5).reduce(addSoundLayer, [] as SoundMixLayer[]);
    const context = await ensureContext();
    [...runningRef.current.keys()].forEach(stopLayer);
    next.forEach((layer) => startLayer(context, layer));
    setStoredMix(next);
    setStoredPaused(false);
  }, [ensureContext, setStoredMix, setStoredPaused, startLayer, stopLayer]);

  useEffect(() => () => {
    [...runningRef.current.keys()].forEach(stopLayer);
    void contextRef.current?.close();
  }, [stopLayer]);

  return {
    mix,
    paused: storedPaused || !ready,
    ready,
    toggleLayer,
    setVolume,
    pause,
    resume,
    restart,
    applyPreset,
  };
}

export type SoundscapeController = ReturnType<typeof useSoundscape>;
