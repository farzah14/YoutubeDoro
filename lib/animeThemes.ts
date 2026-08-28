export interface AnimeScenery {
  id: string;
  name: string;
  jpName: string;
  description: string;
  imageUrl: string;
  particleType: "sakura" | "rain" | "stars" | "fireflies" | "dust";
  accentColor: string; // CSS color or hex
  glowColor: string;
}

export const ANIME_SCENERIES: AnimeScenery[] = [
  {
    id: "sunset-study",
    name: "Sunset Study Room",
    jpName: "夕暮れの部屋",
    description: "Golden hour sunset glowing through study window",
    imageUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=2094&auto=format&fit=crop",
    particleType: "dust",
    accentColor: "#F97316", // Warm amber/orange
    glowColor: "rgba(249, 115, 22, 0.4)",
  },
  {
    id: "rainy-tokyo",
    name: "Rainy Window",
    jpName: "雨の東京",
    description: "Gentle rain streaks with soft city lights",
    imageUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=2070&auto=format&fit=crop",
    particleType: "rain",
    accentColor: "#38BDF8", // Sky blue
    glowColor: "rgba(56, 189, 248, 0.4)",
  },
  {
    id: "sakura-twilight",
    name: "Cherry Blossom Twilight",
    jpName: "桜の夕暮れ",
    description: "Drifting pink sakura petals in spring twilight",
    imageUrl: "https://images.unsplash.com/photo-1522383225653-ed111181a951?q=80&w=2076&auto=format&fit=crop",
    particleType: "sakura",
    accentColor: "#F472B6", // Soft sakura pink
    glowColor: "rgba(244, 114, 182, 0.4)",
  },
  {
    id: "starry-night",
    name: "Ghibli Starry Sky",
    jpName: "星空の夜",
    description: "Deep celestial blue with sparkling stars",
    imageUrl: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=2070&auto=format&fit=crop",
    particleType: "stars",
    accentColor: "#818CF8", // Indigo star
    glowColor: "rgba(129, 140, 248, 0.4)",
  },
  {
    id: "cozy-cafe",
    name: "Cozy Bakery Cafe",
    jpName: "暖かなカフェ",
    description: "Warm wooden cafe with ambient lighting",
    imageUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=2078&auto=format&fit=crop",
    particleType: "fireflies",
    accentColor: "#FBBF24", // Warm amber
    glowColor: "rgba(251, 191, 36, 0.4)",
  },
];

export const DEFAULT_SCENERY_ID = "sunset-study";
