"use client";

import { useEffect, useRef, useState } from "react";
import { openAttentionCamera } from "@/lib/attention/browserCamera";
import {
  createAttentionMonitor,
  type AttentionMonitorStatus,
} from "@/lib/attention/attentionMonitor";
import { createMediaPipeDetector } from "@/lib/attention/mediaPipeDetector";
import { playAttentionAlert } from "@/lib/browserFeatures";

export function useAttentionMonitor(active: boolean, volume: number): AttentionMonitorStatus {
  const [status, setStatus] = useState<AttentionMonitorStatus>("idle");
  const volumeRef = useRef(volume);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    if (!active) {
      return;
    }

    let mounted = true;
    const monitor = createAttentionMonitor({
      openCamera: openAttentionCamera,
      createDetector: createMediaPipeDetector,
      now: () => performance.now(),
      schedule: (callback, delayMs) => window.setTimeout(callback, delayMs),
      cancel: (handle) => window.clearTimeout(handle),
      playAlert: () => playAttentionAlert(volumeRef.current),
      onStatus: (nextStatus) => {
        if (mounted) setStatus(nextStatus);
      },
    });

    void monitor.start();
    return () => {
      mounted = false;
      monitor.stop();
    };
  }, [active]);

  return active ? status : "idle";
}
