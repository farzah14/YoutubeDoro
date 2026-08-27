import { CozyAnimeTheme, ThemeConfig } from "@/types/theme";

export const DEFAULT_THEME: CozyAnimeTheme = "night-study";

export const THEME_ORDER: CozyAnimeTheme[] = [
  "night-study",
  "rainy-evening",
  "sunset-study",
];

export const COZY_THEMES: Record<CozyAnimeTheme, ThemeConfig> = {
  "night-study": {
    id: "night-study",
    name: "Night Study",
    jpName: "夜の勉強",
    description: "Moonlit rooftops and a warm desk lamp for quiet focus",
    backgroundUrl: "/themes/night-study.svg",
    previewColor: "#091424",
    accentColor: "#F6C76D",
    ambientType: "stars",
    sceneAlt: "Illustrated night study room with a moonlit window and desk lamp",
  },
  "rainy-evening": {
    id: "rainy-evening",
    name: "Rainy Evening",
    jpName: "雨の夕暮れ",
    description: "Blue-gray window light and soft city reflections",
    backgroundUrl: "/themes/rainy-evening.svg",
    previewColor: "#0F2030",
    accentColor: "#A8DDEB",
    ambientType: "rain",
    sceneAlt: "Illustrated rainy evening room with a rain-marked window",
  },
  "sunset-study": {
    id: "sunset-study",
    name: "Sunset Study",
    jpName: "夕暮れの部屋",
    description: "Peach light, soft clouds, and a gentle golden-hour desk",
    backgroundUrl: "/themes/sunset-study.svg",
    previewColor: "#2D1E31",
    accentColor: "#F6B375",
    ambientType: "dust",
    sceneAlt: "Illustrated sunset study room with peach light and soft clouds",
  },
};
