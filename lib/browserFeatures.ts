export type NotificationState = "unsupported" | "default" | "granted" | "denied";

function getNotificationApi(): typeof Notification | null {
  if (typeof window === "undefined" || !("Notification" in window)) return null;
  return window.Notification;
}

export function getNotificationState(): NotificationState {
  return getNotificationApi()?.permission ?? "unsupported";
}

async function registerNotificationServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.register("/notification-sw.js", { scope: "/" });
    return await navigator.serviceWorker.ready ?? registration;
  } catch {
    return null;
  }
}

export async function requestNotificationPermission(): Promise<NotificationState> {
  const notificationApi = getNotificationApi();
  if (!notificationApi?.requestPermission) return "unsupported";
  try {
    const permission = await notificationApi.requestPermission();
    if (permission === "granted") await registerNotificationServiceWorker();
    return permission;
  } catch {
    return getNotificationState();
  }
}

export async function notifyTimerComplete(title: string): Promise<void> {
  if (getNotificationState() !== "granted") return;

  const options: NotificationOptions = {
    body: title,
    tag: "studyrithms-timer",
  };
  const registration = await registerNotificationServiceWorker();
  if (registration && typeof registration.showNotification === "function") {
    try {
      await registration.showNotification("Focus interval complete", options);
      return;
    } catch {
      // Fall back to a page notification where supported.
    }
  }

  const notificationApi = getNotificationApi();
  if (!notificationApi) return;
  try {
    new notificationApi("Focus interval complete", options);
  } catch {
    // The browser may block page notifications even after permission changes.
  }
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
  } catch {
    // Autoplay or device policy can reject audio.
  }
}

export function playTimerAlert(kind: "soft" | "level-up" | "none", volume: number): void {
  if (kind === "none") return;

  try {
    const context = getTimerAudioContext();
    if (!context || context.state === "closed") return;
    const normalizedVolume = Math.min(1, Math.max(0, volume / 100));
    if (normalizedVolume === 0) return;

    if (context.state !== "running") void context.resume().catch(() => undefined);

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startAt = context.currentTime;
    const duration = kind === "level-up" ? 0.5 : 0.28;
    const peak = Math.max(0.02, normalizedVolume * 0.22);

    oscillator.type = kind === "level-up" ? "triangle" : "sine";
    oscillator.frequency.value = kind === "level-up" ? 880 : 523.25;
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.05);
  } catch {
    // Audio is an enhancement, not a timer dependency.
  }
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
