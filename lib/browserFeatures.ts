export type NotificationState = "unsupported" | "default" | "granted" | "denied";

export function getNotificationState(): NotificationState {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationState> {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.requestPermission();
}

export function notifyTimerComplete(title: string): void {
  if (getNotificationState() !== "granted") return;
  try { new Notification("Focus interval complete", { body: title }); } catch { /* browser blocked construction */ }
}

let timerAudioContext: AudioContext | null = null;

function getTimerAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const browserWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
  const AudioContextConstructor = window.AudioContext ?? browserWindow.webkitAudioContext;
  if (!AudioContextConstructor) return null;
  timerAudioContext ??= new AudioContextConstructor();
  return timerAudioContext;
}

export async function primeTimerAlertAudio(): Promise<void> {
  try {
    const context = getTimerAudioContext();
    if (!context || context.state === "closed") return;
    if (context.state !== "running") await context.resume();
  } catch { /* autoplay or device policy can reject audio */ }
}

export async function playTimerAlert(kind: "soft" | "level-up" | "none", volume: number): Promise<void> {
  if (kind === "none") return;
  try {
    const context = getTimerAudioContext();
    if (!context) return;
    await primeTimerAlertAudio();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = kind === "level-up" ? "triangle" : "sine";
    oscillator.frequency.value = kind === "level-up" ? 880 : 523.25;
    gain.gain.setValueAtTime(Math.min(1, Math.max(0, volume / 100)) * 0.12, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + (kind === "level-up" ? 0.5 : 0.28));
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + (kind === "level-up" ? 0.5 : 0.28));
  } catch { /* audio is an enhancement, not a timer dependency */ }
}

export interface WakeLockHandle {
  release: () => Promise<void>;
}

export async function requestScreenWakeLock(): Promise<WakeLockHandle | null> {
  const wakeLock = (typeof navigator !== "undefined" ? navigator : null) as (Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLockHandle> } }) | null;
  if (!wakeLock?.wakeLock) return null;
  try { return await wakeLock.wakeLock.request("screen"); } catch { return null; }
}

export function supportsDocumentPictureInPicture(): boolean {
  if (typeof window === "undefined") return false;
  const documentPictureInPicture = (window as Window & {
    documentPictureInPicture?: { requestWindow?: unknown };
  }).documentPictureInPicture;
  return typeof documentPictureInPicture?.requestWindow === "function";
}

export function supportsVideoPictureInPicture(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (document.pictureInPictureEnabled !== true) return false;
  if (typeof HTMLVideoElement === "undefined" || typeof HTMLCanvasElement === "undefined") return false;
  const videoPrototype = HTMLVideoElement.prototype as HTMLVideoElement & {
    requestPictureInPicture?: unknown;
  };
  const canvasPrototype = HTMLCanvasElement.prototype as HTMLCanvasElement & {
    captureStream?: unknown;
  };
  return typeof videoPrototype.requestPictureInPicture === "function"
    && typeof canvasPrototype.captureStream === "function";
}

export function supportsPictureInPicture(): boolean {
  return supportsDocumentPictureInPicture() || supportsVideoPictureInPicture();
}
