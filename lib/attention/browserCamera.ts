import { ATTENTION_CONFIG } from "./config";

export type AttentionCamera = {
  frame: HTMLVideoElement;
  stop(): void;
};

function stopTracks(stream: MediaStream): void {
  stream.getTracks().forEach((track) => track.stop());
}

export async function openAttentionCamera(): Promise<AttentionCamera> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera access is not available in this browser.");
  }

  const videoWidth = ATTENTION_CONFIG.videoWidth;
  const videoHeight = ATTENTION_CONFIG.videoHeight;
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: "user",
      width: { ideal: videoWidth },
      height: { ideal: videoHeight },
    },
  });
  const frame = document.createElement("video");
  frame.hidden = true;
  frame.muted = true;
  frame.defaultMuted = true;
  frame.autoplay = true;
  frame.playsInline = true;
  frame.srcObject = stream;

  try {
    await frame.play();
  } catch (error) {
    stopTracks(stream);
    frame.srcObject = null;
    throw error;
  }

  return {
    frame,
    stop() {
      frame.pause();
      frame.srcObject = null;
      stopTracks(stream);
    },
  };
}
