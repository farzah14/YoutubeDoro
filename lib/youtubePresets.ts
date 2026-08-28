import { BreakPreset, SavedBreakVideo } from "@/types";

export const BREAK_PRESETS: BreakPreset[] = [
  {
    id: "desk-stretch",
    title: "5-Min Desk & Neck Stretch",
    category: "stretch",
    categoryLabel: "🧘 Stretch",
    videoId: "4BOTva4hSTc",
    durationLabel: "5 min",
  },
  {
    id: "eye-relief",
    title: "Eye Strain Relief & 20-20-20",
    category: "eyes",
    categoryLabel: "👀 Eye Relief",
    videoId: "_y6YdO5h0qA",
    durationLabel: "5 min",
  },
  {
    id: "box-breathing",
    title: "5-Min Mindful Box Breathing",
    category: "breathe",
    categoryLabel: "🌬️ Breathing",
    videoId: "inpok4MKVLM",
    durationLabel: "5 min",
  },
  {
    id: "nature-walk",
    title: "Peaceful 4K Nature Walk",
    category: "nature",
    categoryLabel: "🌿 Nature",
    videoId: "fQ3A_n5sMTo",
    durationLabel: "Ambient",
  },
  {
    id: "cafe-break",
    title: "Cozy Bakery Cafe Break",
    category: "cafe",
    categoryLabel: "☕ Cafe",
    videoId: "Xn8tHskP7vE",
    durationLabel: "Chill",
  },
];

export const DEFAULT_SAVED_BREAKS: SavedBreakVideo[] = [
  {
    id: "def-stretch",
    title: "5-Min Desk Stretch",
    videoId: "4BOTva4hSTc",
    addedAt: 1700000000000,
  },
  {
    id: "def-breathing",
    title: "Box Breathing Reset",
    videoId: "inpok4MKVLM",
    addedAt: 1700000001000,
  },
];
