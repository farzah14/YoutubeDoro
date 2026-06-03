export const KEYS = {
  learnByDay: (day: string) => `ytdoro:${day}:learnSec`,
  restByDay: (day: string) => `ytdoro:${day}:restSec`,
  legacyBreakByDay: (day: string) => `ytdoro:${day}:breakSec`,
  topicByDay: (day: string) => `ytdoro:${day}:topic`,
  notesByDay: (day: string) => `ytdoro:${day}:notes`,
  sessionGoal: "ytdoro:sessionGoal",
  isLoFiEnabled: "ytdoro:isLoFiEnabled",

  // Notion Integration
  notionConnected: "ytdoro:notion:connected",
  notionDatabaseId: "ytdoro:notion:databaseId",
  notionLastSync: "ytdoro:notion:lastSync",
  notionSyncQueue: "ytdoro:notion:syncQueue",
  notionPageIdByDay: (day: string) => `ytdoro:notion:${day}:pageId`,
};

export const PRESETS = {
  learning: [25, 50],
  rest: [5, 10, 15],
};

export const NOTION_SYNC_DEBOUNCE_MS = 3000;
