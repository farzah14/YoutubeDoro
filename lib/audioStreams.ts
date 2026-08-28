import { RadioStation } from "@/types";

export const RADIO_STATIONS: RadioStation[] = [
  {
    id: "lofi-girl",
    name: "Lofi Study Beats",
    genre: "Lo-Fi / Chillhop",
    videoId: "lTRiuFIWV54",
    icon: "🎧",
  },
  {
    id: "synthwave",
    name: "Synthwave Coding",
    genre: "Synth / Retrowave",
    videoId: "4xDzrJKXOOY",
    icon: "🌆",
  },
  {
    id: "coffee-shop",
    name: "Cozy Coffee & Jazz",
    genre: "Jazz / Rain Ambiance",
    videoId: "h2zkV-l_TbY",
    icon: "☕",
  },
  {
    id: "binaural",
    name: "Binaural Alpha Waves",
    genre: "Focus Frequency",
    videoId: "WPni755-Krg",
    icon: "🧠",
  },
  {
    id: "rain",
    name: "Gentle Rain & Thunder",
    genre: "Nature Soundscape",
    videoId: "mPZkdNFkNps",
    icon: "🌧️",
  },
  {
    id: "forest",
    name: "Forest Stream",
    genre: "Calming Wildlife",
    videoId: "xNN7iTA57jM",
    icon: "🌿",
  },
];

export const DEFAULT_STATION_ID = "lofi-girl";
export const DEFAULT_LOFI_VOLUME = 40;
