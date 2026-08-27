export type CozyAnimeTheme = "night-study" | "rainy-evening" | "sunset-study";

export interface ThemeConfig {
  id: CozyAnimeTheme;
  name: string;
  jpName: string;
  description: string;
  backgroundUrl: string;
  previewColor: string;
  accentColor: string;
  ambientType: "stars" | "rain" | "dust";
  sceneAlt: string;
}
