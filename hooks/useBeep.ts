"use client";

import { useRef, useEffect } from "react";

export function useBeep() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  function getAudioContext(): AudioContext | null {
    const W = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctx = W.AudioContext ?? W.webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
    return audioCtxRef.current;
  }

  async function primeAudio() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === "suspended") await ctx.resume();
    } catch {
      // ignore
    }
  }

  function beepOnce(freq = 880, ms = 260) {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "square";
      osc.frequency.value = freq;

      const t = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.9, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + ms / 1000 + 0.03);
    } catch {
      // ignore
    }
  }

  function beepTriple() {
    beepOnce(880, 260);
    window.setTimeout(() => beepOnce(880, 260), 300);
    window.setTimeout(() => beepOnce(880, 260), 600);
  }

  function cleanup() {
    try {
      audioCtxRef.current?.close?.();
    } catch {
      // ignore
    }
    audioCtxRef.current = null;
  }
  
  useEffect(() => {
    return cleanup;
  }, []);

  return { primeAudio, beepTriple, cleanup };
}
