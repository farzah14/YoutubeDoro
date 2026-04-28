export const KEYS = {
  learnByDay: (day: string) => `ytdoro:${day}:learnSec`,
  restByDay: (day: string) => `ytdoro:${day}:restSec`,
  legacyBreakByDay: (day: string) => `ytdoro:${day}:breakSec`,
  topicByDay: (day: string) => `ytdoro:${day}:topic`,
  notesByDay: (day: string) => `ytdoro:${day}:notes`,
  sessionGoal: "ytdoro:sessionGoal",
  isLoFiEnabled: "ytdoro:isLoFiEnabled",
};

export const PRESETS = {
  learning: [25, 50],
  rest: [5, 10, 15],
};
