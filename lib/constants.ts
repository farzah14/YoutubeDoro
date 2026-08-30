export const KEYS = {
  dailyGoalSec: "ytdoro:dailyGoalSec",
  isLoFiEnabled: "ytdoro:isLoFiEnabled",
  lofiStation: "ytdoro:lofi:station",
  lofiVolume: "ytdoro:lofi:volume",
  lofiMuted: "ytdoro:lofi:muted",
  savedMusicEmbeds: "ytdoro:parity:v1:saved-music-embeds",
  activeMusicEmbed: "ytdoro:parity:v1:active-music-embed",
  soundscapeMix: "ytdoro:parity:v1:soundscape-mix",
  soundscapePaused: "ytdoro:parity:v1:soundscape-paused",
  savedBreakVideos: "ytdoro:savedBreakVideos",
  theme: "ytdoro:theme",
  themeBySlot: (slot: "home" | "focus") => `ytdoro:theme:${slot}`,
  clock24Hour: "ytdoro:clock:24hour",
  clockShowSeconds: "ytdoro:clock:seconds",
  dashboardName: "ytdoro:home:name",
  greetingStyle: "ytdoro:home:greeting-style",
  focusPreferences: "ytdoro:parity:v1:focus-preferences",
  showTaskProgress: "ytdoro:parity:v1:task-progress",
  clearMode: "ytdoro:parity:v1:clear-mode",
  themeSlots: "ytdoro:parity:v1:theme-slots",
  customThemeMeta: "ytdoro:parity:v1:custom-theme-meta",
  customThemeBySlot: (slot: "home" | "focus") => `ytdoro:parity:v1:custom-theme:${slot}`,
  themeOverlayBySlot: (slot: "home" | "focus") => `ytdoro:parity:v1:theme-overlay:${slot}`,
  animeScenery: "ytdoro:animeScenery",
  particlesEnabled: "ytdoro:particlesEnabled",

};

export const PRESETS = {
  learning: [25, 45, 50],
  rest: [5, 10, 15],
  defaultGoalHours: 2,
};
