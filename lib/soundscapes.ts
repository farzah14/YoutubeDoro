export type SoundCategory = "Nature" | "Cozy" | "Noise";

export interface SoundMixLayer {
  id: string;
  volume: number;
}

export interface SoundRuntime {
  node: AudioNode;
  stop: () => void;
}

export interface ProceduralSound {
  id: string;
  label: string;
  emoji: string;
  category: SoundCategory;
  defaultVolume: number;
  create: (context: AudioContext) => SoundRuntime;
}

type NoiseColor = "white" | "pink" | "brown";

function noiseBuffer(context: AudioContext, color: NoiseColor): AudioBuffer {
  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const data = buffer.getChannelData(0);
  let brown = 0;
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let index = 0; index < data.length; index += 1) {
    const white = Math.random() * 2 - 1;
    if (color === "white") data[index] = white;
    else if (color === "brown") {
      brown = (brown + 0.02 * white) / 1.02;
      data[index] = brown * 3.5;
    } else {
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[index] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }
  return buffer;
}

function createNoise(
  color: NoiseColor,
  filter?: { type: BiquadFilterType; frequency: number; q?: number }
) {
  return (context: AudioContext): SoundRuntime => {
    const source = context.createBufferSource();
    source.buffer = noiseBuffer(context, color);
    source.loop = true;
    let node: AudioNode = source;
    if (filter) {
      const biquad = context.createBiquadFilter();
      biquad.type = filter.type;
      biquad.frequency.value = filter.frequency;
      biquad.Q.value = filter.q ?? 0.7;
      source.connect(biquad);
      node = biquad;
    }
    source.start();
    return { node, stop: () => { try { source.stop(); } catch { /* already stopped */ } source.disconnect(); } };
  };
}

export const SOUNDSCAPE_CATALOG: ProceduralSound[] = [
  { id: "rain", label: "Light Rain", emoji: "🌧️", category: "Nature", defaultVolume: 45, create: createNoise("white", { type: "highpass", frequency: 1400 }) },
  { id: "campfire", label: "Campfire", emoji: "🔥", category: "Cozy", defaultVolume: 38, create: createNoise("brown", { type: "lowpass", frequency: 520 }) },
  { id: "wind", label: "Wind", emoji: "🍃", category: "Nature", defaultVolume: 32, create: createNoise("pink", { type: "bandpass", frequency: 620, q: 0.45 }) },
  { id: "white-noise", label: "White Noise", emoji: "◻️", category: "Noise", defaultVolume: 22, create: createNoise("white") },
  { id: "pink-noise", label: "Pink Noise", emoji: "🌸", category: "Noise", defaultVolume: 28, create: createNoise("pink") },
  { id: "brown-noise", label: "Brown Noise", emoji: "🟤", category: "Noise", defaultVolume: 34, create: createNoise("brown") },
];

export function sanitizeSoundMix(value: unknown): SoundMixLayer[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const mix: SoundMixLayer[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const { id, volume } = item as Record<string, unknown>;
    if (typeof id !== "string" || seen.has(id) || !SOUNDSCAPE_CATALOG.some((sound) => sound.id === id)) continue;
    seen.add(id);
    mix.push({ id, volume: Math.min(100, Math.max(0, Math.round(typeof volume === "number" ? volume : 40))) });
    if (mix.length === 5) break;
  }
  return mix;
}

export function addSoundLayer(mix: SoundMixLayer[], id: string): SoundMixLayer[] {
  if (mix.length >= 5 || mix.some((layer) => layer.id === id)) return mix;
  const sound = SOUNDSCAPE_CATALOG.find((item) => item.id === id);
  return sound ? [...mix, { id, volume: sound.defaultVolume }] : mix;
}
