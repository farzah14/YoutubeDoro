"use client";

import { formatMMSS } from "@/lib/time";
import type { FocusTimer } from "@/hooks/useFocusTimer";
import { supportsPictureInPicture } from "@/lib/browserFeatures";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { TaskItem } from "@/types";
import type { TimerPhase } from "@/types/focus";
import { FlameIcon, LightbulbIcon, PencilIcon, PictureInPictureIcon, RotateCcwIcon } from "../icons";

interface LearningCardProps {
  topicToday: string;
  totalTodaySec: number;
  pipBackgroundUrl: string;
  timer: FocusTimer;
  onRunningChange?: (running: boolean) => void;
  tasks: TaskItem[];
  activeTaskId: string | null;
  onOpenTasks: () => void;
  onProgress?: (phase: TimerPhase, elapsedSeconds: number, status: "idle" | "running" | "paused" | "done") => void;
}

interface PipSnapshot {
  displaySeconds: number;
  phase: TimerPhase;
  showTaskInPip: boolean;
  taskLabel: string;
}

interface PipNodes {
  time: HTMLElement;
  phase: HTMLElement;
}

function drawPipCanvas(
  canvas: HTMLCanvasElement,
  snapshot: PipSnapshot,
  backgroundImage: HTMLImageElement | null,
) {
  const context = canvas.getContext("2d");
  if (!context) return;

  const width = canvas.width;
  const height = canvas.height;
  if (backgroundImage?.complete && backgroundImage.naturalWidth > 0 && backgroundImage.naturalHeight > 0) {
    const scale = Math.max(width / backgroundImage.naturalWidth, height / backgroundImage.naturalHeight);
    const imageWidth = backgroundImage.naturalWidth * scale;
    const imageHeight = backgroundImage.naturalHeight * scale;
    context.drawImage(
      backgroundImage,
      (width - imageWidth) / 2,
      (height - imageHeight) / 2,
      imageWidth,
      imageHeight,
    );
  } else {
    const background = context.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, "#102a47");
    background.addColorStop(1, "#07111e");
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
  }
  context.fillStyle = "rgba(7, 17, 30, 0.56)";
  context.fillRect(0, 0, width, height);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#ffffff";
  context.font = "800 104px ui-monospace, SFMono-Regular, Consolas, monospace";
  context.fillText(formatMMSS(snapshot.displaySeconds), width / 2, height * 0.48);

  const phaseLabel = snapshot.phase === "focus" ? "Focus" : "Break";
  const label = snapshot.showTaskInPip ? `${phaseLabel} · ${snapshot.taskLabel}` : phaseLabel;
  const visibleLabel = label.length > 48 ? `${label.slice(0, 47)}…` : label;
  context.fillStyle = snapshot.phase === "focus" ? "#f6c76d" : "#7ed6af";
  context.font = "700 24px Inter, ui-sans-serif, system-ui, sans-serif";
  context.fillText(visibleLabel, width / 2, height * 0.82);
}

function attachPipStream(video: HTMLVideoElement, stream: MediaStream) {
  video.srcObject = stream;
}

const phases: Array<["focus" | "break", string]> = [
  ["focus", "Focus"],
  ["break", "Break"],
];

const phaseIcons = {
  focus: LightbulbIcon,
  break: FlameIcon,
};

interface PhasePickerProps {
  phase: "focus" | "break";
  disabled: boolean;
  onChange: (phase: "focus" | "break") => void;
}

function PhasePicker({ phase, disabled, onChange }: PhasePickerProps) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const CurrentIcon = phaseIcons[phase];
  const phaseLabel = phase === "focus" ? "Focus" : "Break";
  const pickerOpen = open && !disabled;

  useEffect(() => {
    if (!pickerOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [pickerOpen]);

  return (
    <div className="focus-dashboard__phase-picker" ref={pickerRef}>
      <button
        ref={triggerRef}
        type="button"
        className="focus-dashboard__phase-trigger"
        data-phase={phase}
        aria-label={`Timer phase: ${phaseLabel}`}
        aria-haspopup="listbox"
        aria-expanded={pickerOpen}
        aria-controls="focus-phase-menu"
        title={`Timer phase: ${phaseLabel}`}
        onClick={() => setOpen((isOpen) => !isOpen)}
        disabled={disabled}
      >
        <CurrentIcon className="h-5 w-5" aria-hidden="true" />
        <span className="sr-only">Timer phase: {phaseLabel}</span>
      </button>
      {pickerOpen && (
        <div id="focus-phase-menu" className="focus-dashboard__phase-menu" role="listbox" aria-label="Timer phase">
          {phases.map(([option, label]) => {
            const PhaseIcon = phaseIcons[option];
            const selected = phase === option;
            return (
              <button
                key={option}
                type="button"
                className="focus-dashboard__phase-option"
                data-phase={option}
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
              >
                <PhaseIcon className="h-4 w-4" aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const subscribeToPipSupport = () => () => {};

export function LearningCard({
  topicToday,
  pipBackgroundUrl,
  timer,
  onRunningChange,
  tasks,
  activeTaskId,
  onOpenTasks,
  onProgress,
}: LearningCardProps) {
  const pipSupported = useSyncExternalStore(
    subscribeToPipSupport,
    supportsPictureInPicture,
    () => false,
  );
  const activeTask = tasks.find((task) => task.id === activeTaskId)
    ?? tasks.find((task) => !task.completed);
  const taskLabel = activeTask?.text || topicToday.trim() || "What do you want to focus on?";
  const isRunning = timer.state.status === "running";
  const isPaused = timer.state.status === "paused";
  const visiblePhase = timer.state.phase === "focus" ? "focus" : "break";
  const showPhases = timer.preferences.mode !== "countdown" && timer.preferences.mode !== "stopwatch";
  const primaryLabel = isRunning ? "Pause" : isPaused ? "Resume" : visiblePhase === "break" ? "Break" : "Start";

  useEffect(() => {
    onProgress?.(timer.state.phase, timer.state.elapsedSeconds, timer.state.status);
  }, [onProgress, timer.state.elapsedSeconds, timer.state.phase, timer.state.status]);

  const pipWindowRef = useRef<Window | null>(null);
  const pipNodesRef = useRef<PipNodes | null>(null);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);
  const pipCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pipBackgroundImageRef = useRef<HTMLImageElement | null>(null);
  const pipStreamRef = useRef<MediaStream | null>(null);
  const pipSnapshotRef = useRef<PipSnapshot>({
    displaySeconds: timer.displaySeconds,
    phase: timer.state.phase,
    showTaskInPip: timer.preferences.showTaskInPip,
    taskLabel,
  });

  const updatePip = useCallback(() => {
    const snapshot = pipSnapshotRef.current;
    const nodes = pipNodesRef.current;
    const pipWindow = pipWindowRef.current;
    if (nodes && pipWindow && !pipWindow.closed) {
      const phaseLabel = snapshot.phase === "focus" ? "Focus" : "Break";
      nodes.time.textContent = formatMMSS(snapshot.displaySeconds);
      nodes.phase.textContent = snapshot.showTaskInPip
        ? `${phaseLabel} · ${snapshot.taskLabel}`
        : phaseLabel;
    }

    const canvas = pipCanvasRef.current;
    if (canvas) drawPipCanvas(canvas, snapshot, pipBackgroundImageRef.current);
  }, []);

  useEffect(() => {
    let active = true;
    const image = new Image();
    image.decoding = "async";
    pipBackgroundImageRef.current = null;
    image.onload = () => {
      if (!active) return;
      pipBackgroundImageRef.current = image;
      updatePip();
    };
    image.onerror = () => {
      if (!active) return;
      if (pipBackgroundImageRef.current === image) pipBackgroundImageRef.current = null;
      updatePip();
    };
    image.src = pipBackgroundUrl;
    if (image.complete && image.naturalWidth > 0) {
      pipBackgroundImageRef.current = image;
      updatePip();
    }
    return () => {
      active = false;
      if (pipBackgroundImageRef.current === image) pipBackgroundImageRef.current = null;
    };
  }, [pipBackgroundUrl, updatePip]);

  const cleanupVideoPip = useCallback(() => {
    const video = pipVideoRef.current;
    video?.pause();
    if (video) {
      video.srcObject = null;
      video.remove();
    }
    pipStreamRef.current?.getTracks().forEach((track) => track.stop());
    pipStreamRef.current = null;
    pipCanvasRef.current = null;
    pipVideoRef.current = null;
  }, []);

  useEffect(() => {
    pipSnapshotRef.current = {
      displaySeconds: timer.displaySeconds,
      phase: timer.state.phase,
      showTaskInPip: timer.preferences.showTaskInPip,
      taskLabel,
    };
    updatePip();
  }, [taskLabel, timer.displaySeconds, timer.preferences.showTaskInPip, timer.state.phase, updatePip]);

  useEffect(() => {
    const running = timer.state.status === "running";
    onRunningChange?.(running);
    return () => onRunningChange?.(false);
  }, [onRunningChange, timer.state.status]);

  useEffect(() => () => {
    pipWindowRef.current?.close();
    pipWindowRef.current = null;
    pipNodesRef.current = null;
    cleanupVideoPip();
  }, [cleanupVideoPip]);

  const openVideoPip = async () => {
    let canvas = pipCanvasRef.current;
    if (!canvas) {
      const createdCanvas = document.createElement("canvas");
      createdCanvas.width = 640;
      createdCanvas.height = 360;
      pipCanvasRef.current = createdCanvas;
      canvas = createdCanvas;
    }

    let video = pipVideoRef.current;
    if (!video) {
      const createdVideo = document.createElement("video");
      createdVideo.muted = true;
      createdVideo.defaultMuted = true;
      createdVideo.autoplay = true;
      createdVideo.playsInline = true;
      createdVideo.controls = false;
      createdVideo.setAttribute("aria-hidden", "true");
      Object.assign(createdVideo.style, {
        position: "fixed",
        left: "-9999px",
        top: "0",
        width: "1px",
        height: "1px",
        opacity: "0",
        pointerEvents: "none",
      });
      pipVideoRef.current = createdVideo;
      video = createdVideo;
      document.body.append(createdVideo);
    }

    const videoWithPip = video as HTMLVideoElement & {
      requestPictureInPicture?: () => Promise<unknown>;
    };
    const canvasWithStream = canvas as HTMLCanvasElement & {
      captureStream?: (frameRate?: number) => MediaStream;
    };
    const captureStream = canvasWithStream.captureStream;
    const requestPictureInPicture = videoWithPip.requestPictureInPicture;
    if (typeof requestPictureInPicture !== "function" || typeof captureStream !== "function") {
      cleanupVideoPip();
      return;
    }

    const pipDocument = document as Document & {
      pictureInPictureElement?: Element | null;
      exitPictureInPicture?: () => Promise<void>;
    };
    if (pipDocument.pictureInPictureElement === video) {
      await pipDocument.exitPictureInPicture?.();
      return;
    }

    let stream = pipStreamRef.current;
    if (!stream) {
      try {
        stream = captureStream.call(canvas, 1);
      } catch {
        cleanupVideoPip();
        return;
      }
      pipStreamRef.current = stream;
    }
    attachPipStream(video, stream);
    updatePip();

    const handleLeave = () => cleanupVideoPip();
    video.addEventListener("leavepictureinpicture", handleLeave, { once: true });
    try {
      await video.play();
      await requestPictureInPicture.call(video);
    } catch {
      video.removeEventListener("leavepictureinpicture", handleLeave);
      cleanupVideoPip();
    }
  };

  const openPip = async () => {
    const pictureInPicture = (window as Window & { documentPictureInPicture?: { requestWindow: (options: { width: number; height: number }) => Promise<Window> } }).documentPictureInPicture;
    if (!pictureInPicture) {
      await openVideoPip();
      return;
    }

    const existingWindow = pipWindowRef.current;
    if (existingWindow && !existingWindow.closed) {
      existingWindow.focus();
      updatePip();
      return;
    }

    try {
      const pipWindow = await pictureInPicture.requestWindow({ width: 320, height: 180 });
      pipWindowRef.current = pipWindow;
      pipWindow.document.body.innerHTML = "";
      const style = pipWindow.document.createElement("style");
      style.textContent = `
        :root { color-scheme: dark; }
        * { box-sizing: border-box; }
        html, body { min-height: 100%; }
        body {
          display: grid;
          min-height: 100vh;
          margin: 0;
          place-items: center;
          background-color: #0b1a2a;
          background-position: center;
          background-size: cover;
          color: #dde7e2;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        }
        body::before {
          position: fixed;
          inset: 0;
          background: rgba(7, 16, 27, 0.66);
          content: "";
        }
        main {
          position: relative;
          display: grid;
          width: 100%;
          height: 100%;
          align-content: center;
          justify-items: center;
          gap: 0.3rem;
          padding: 1rem;
          background: rgba(11, 26, 42, 0.32);
          text-align: center;
        }
        time {
          color: #fff;
          font: 700 clamp(2rem, 18vw, 4rem)/0.9 ui-monospace, SFMono-Regular, Consolas, monospace;
          letter-spacing: 0.04em;
        }
        small {
          max-width: 100%;
          overflow: hidden;
          color: #dde7e2;
          font-size: 0.68rem;
          font-weight: 700;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `;
      pipWindow.document.head.append(style);
      const main = pipWindow.document.createElement("main");
      const time = pipWindow.document.createElement("time");
      const phase = pipWindow.document.createElement("small");
      main.append(time, phase);
      pipWindow.document.body.append(main);
      pipWindow.document.body.style.backgroundImage = `url(${JSON.stringify(pipBackgroundUrl)})`;
      pipNodesRef.current = { time, phase };
      updatePip();
      pipWindow.addEventListener("pagehide", () => {
        if (pipWindowRef.current !== pipWindow) return;
        pipWindowRef.current = null;
        pipNodesRef.current = null;
      }, { once: true });
    } catch {
      await openVideoPip();
    }
  };

  const handlePrimary = () => {
    if (isRunning) timer.pause();
    else if (isPaused) timer.resume();
    else {
      void timer.start();
    }
  };

  return (
    <section className="focus-dashboard" aria-labelledby="focus-task-title" data-phase={visiblePhase}>
      <header className="focus-dashboard__context">
        <span className="focus-dashboard__context-label">Current priority</span>
        <button type="button" className="focus-dashboard__priority-action" onClick={onOpenTasks} title="Change priority">
          <span id="focus-task-title" className="focus-dashboard__task-label">{taskLabel}</span>
          <PencilIcon className="focus-dashboard__priority-icon h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Change priority</span>
        </button>
      </header>

      <time className="focus-dashboard__time numeric-time" aria-live="polite">
        {formatMMSS(timer.displaySeconds)}
      </time>

      <div className="focus-dashboard__controls">
        <button type="button" className="focus-dashboard__primary" onClick={handlePrimary}>
          {primaryLabel}
        </button>
        <button type="button" className="focus-dashboard__icon" onClick={timer.reset} aria-label="Reset timer">
          <RotateCcwIcon className="h-7 w-7" aria-hidden="true" />
        </button>
        <button type="button" className="focus-dashboard__pip" onClick={() => { void openPip(); }} disabled={!pipSupported} aria-label="Open picture-in-picture" title={pipSupported ? "Open picture-in-picture" : "Picture-in-picture is not supported in this browser"}>
          <PictureInPictureIcon className="h-5 w-5" aria-hidden="true" />
        </button>
        {showPhases && <PhasePicker phase={visiblePhase} disabled={isRunning} onChange={(phase) => timer.selectPhase(phase)} />}
      </div>

    </section>
  );
}
