export type CozyAnimeTheme =
  | "night-study"
  | "rainy-evening"
  | "sunset-study"
  | "lantern-library"
  | "rooftop-bluehour"
  | "train-window"
  | "forest-cabin"
  | "cherry-dawn"
  | "violet-sky"
  | "forest-green"
  | "anime-sky"
  | "sakura-street"
  | "ocean-horizon"
  | "misty-mountains"
  | "cozy-cafe";

export type ThemeGroup = "Anime Rooms" | "Ambient Worlds" | "Gradients & Colors";

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
  group: ThemeGroup;
  brightness: "low" | "medium" | "high";
  dominantColor: "blue" | "purple" | "gold" | "green" | "peach";
}
