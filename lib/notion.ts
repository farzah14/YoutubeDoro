import { Client } from "@notionhq/client";
import type { DailyNoteEntry } from "@/types";

// ──────────────────────────────────────────────
// Notion Client Singleton
// ──────────────────────────────────────────────

let _client: Client | null = null;

export function getNotionClient(token?: string): Client {
  // When client sends "env" or "server", use the server-side environment variable
  const isEnvToken = !token || token === "env" || token === "server";
  const t = isEnvToken ? process.env.NOTION_TOKEN : token;
  if (!t) throw new Error("NOTION_TOKEN is not configured. Add it to your .env.local file.");
  if (!_client || !isEnvToken) {
    _client = new Client({ auth: t });
  }
  return _client;
}

// ──────────────────────────────────────────────
// Database Schema — create a fresh Notion DB
// ──────────────────────────────────────────────

export async function createNotionDatabase(
  client: Client,
  parentPageId: string
) {
  const response = await client.databases.create({
    parent: { type: "page_id", page_id: parentPageId },
    title: [{ type: "text", text: { content: "YoutubeDoro — Study Tracker" } }],
    description: [
      {
        type: "text",
        text: { content: "Auto-synced from YoutubeDoro Pomodoro Timer" },
      },
    ],
    initial_data_source: {
      properties: {
        Date: { type: "title", title: {} },
        Topic: { type: "rich_text", rich_text: {} },
        "Focus (min)": { type: "number", number: { format: "number" } },
        "Rest (min)": { type: "number", number: { format: "number" } },
        Sessions: { type: "number", number: { format: "number" } },
        Status: {
          type: "select",
          select: {
            options: [
              { name: "In Progress", color: "yellow" },
              { name: "Completed", color: "green" },
            ],
          },
        },
        "Last Synced": { type: "date", date: {} },
        Scratchpad: { type: "rich_text", rich_text: {} },
      },
    },
  });
  return response;
}

// ──────────────────────────────────────────────
// Format Helpers
// ──────────────────────────────────────────────

export function formatNotesForNotion(notes: DailyNoteEntry[]): string {
  if (!notes.length) return "—";
  return notes
    .map((n) => {
      const time = new Date(n.ts).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const learnMin = Math.round(n.deltaLearnSec / 60);
      const restMin = Math.round(n.deltaRestSec / 60);
      let detail = "";
      if (learnMin > 0) detail += ` +${learnMin}m focus`;
      if (restMin > 0) detail += ` +${restMin}m rest`;
      return `[${time}] ${kindEmoji(n.kind)} ${n.title}${detail}`;
    })
    .join("\n");
}

function kindEmoji(
  kind: string
): string {
  switch (kind) {
    case "learn_start":
      return "🟢";
    case "learn_done":
      return "✅";
    case "learn_stop":
      return "⏹️";
    case "rest_done":
      return "☕";
    case "rest_stop":
      return "⏸️";
    case "yt_rest_done":
      return "🎬";
    case "yt_rest_stop":
      return "📺";
    case "topic_set":
      return "📝";
    default:
      return "•";
  }
}

export function formatMMSS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (hh > 0) return `${hh}h ${String(mm).padStart(2, "0")}m`;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

// ──────────────────────────────────────────────
// Build Notion Page Properties
// ──────────────────────────────────────────────

export function buildPageProperties(payload: {
  day: string;
  topic: string;
  learnSec: number;
  restSec: number;
  notes: DailyNoteEntry[];
  scratchpad?: string;
}) {
  const sessionCount = payload.notes.filter(
    (n) => n.kind === "learn_done" || n.kind === "learn_stop"
  ).length;

  const notesText = formatNotesForNotion(payload.notes);

  // Notion rich_text max is 2000 chars
  const truncatedNotes =
    notesText.length > 2000 ? notesText.slice(0, 1997) + "..." : notesText;
  const truncatedScratchpad =
    (payload.scratchpad || "").length > 2000
      ? (payload.scratchpad || "").slice(0, 1997) + "..."
      : payload.scratchpad || "";

  return {
    Date: {
      title: [{ text: { content: payload.day } }],
    },
    Topic: {
      rich_text: [{ text: { content: payload.topic || "(No topic)" } }],
    },
    "Focus (min)": {
      number: Math.round((payload.learnSec / 60) * 100) / 100,
    },
    "Rest (min)": {
      number: Math.round((payload.restSec / 60) * 100) / 100,
    },
    Sessions: {
      number: sessionCount,
    },
    Status: {
      select: { name: payload.learnSec >= 7200 ? "Completed" : "In Progress" },
    },
    "Last Synced": {
      date: { start: new Date().toISOString() },
    },
    Scratchpad: {
      rich_text: [{ text: { content: truncatedScratchpad } }],
    },
  };
}

// ──────────────────────────────────────────────
// Build Notion Page Body (children blocks)
// ──────────────────────────────────────────────

export function buildPageChildren(payload: {
  day: string;
  topic: string;
  learnSec: number;
  restSec: number;
  notes: DailyNoteEntry[];
  scratchpad?: string;
}) {
  const blocks: Record<string, unknown>[] = [];

  // Header
  blocks.push({
    object: "block",
    type: "heading_2",
    heading_2: {
      rich_text: [{ type: "text", text: { content: `📚 ${payload.day} — ${payload.topic || "Study Session"}` } }],
    },
  });

  // Summary callout
  blocks.push({
    object: "block",
    type: "callout",
    callout: {
      icon: { type: "emoji", emoji: "⏱️" },
      rich_text: [
        {
          type: "text",
          text: {
            content: `Focus: ${formatMMSS(payload.learnSec)} | Rest: ${formatMMSS(payload.restSec)} | Sessions: ${payload.notes.filter((n) => n.kind === "learn_done" || n.kind === "learn_stop").length}`,
          },
        },
      ],
    },
  });

  // Divider
  blocks.push({ object: "block", type: "divider", divider: {} });

  // Activity log heading
  if (payload.notes.length > 0) {
    blocks.push({
      object: "block",
      type: "heading_3",
      heading_3: {
        rich_text: [{ type: "text", text: { content: "📋 Activity Log" } }],
      },
    });

    // Each note as a bulleted list item (max 100 blocks per request)
    const logNotes = payload.notes.slice(0, 90);
    for (const note of logNotes) {
      const time = new Date(note.ts).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const learnMin = Math.round(note.deltaLearnSec / 60);
      const restMin = Math.round(note.deltaRestSec / 60);
      let detail = "";
      if (learnMin > 0) detail += ` (+${learnMin}m focus)`;
      if (restMin > 0) detail += ` (+${restMin}m rest)`;

      blocks.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [
            {
              type: "text",
              text: {
                content: `${kindEmoji(note.kind)} [${time}] ${note.title}${detail}`,
              },
            },
          ],
        },
      });
    }
  }

  // Scratchpad
  if (payload.scratchpad && payload.scratchpad.trim()) {
    blocks.push({ object: "block", type: "divider", divider: {} });
    blocks.push({
      object: "block",
      type: "heading_3",
      heading_3: {
        rich_text: [{ type: "text", text: { content: "📝 Scratchpad" } }],
      },
    });

    // Split scratchpad into paragraphs (max 2000 chars each)
    const paragraphs = payload.scratchpad.split("\n\n").filter(Boolean);
    for (const para of paragraphs.slice(0, 20)) {
      const truncated = para.length > 2000 ? para.slice(0, 1997) + "..." : para;
      blocks.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: truncated } }],
        },
      });
    }
  }

  return blocks;
}

// ──────────────────────────────────────────────
// Parse Notion Page → App Data (for pull/two-way)
// ──────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
export function parseNotionPage(page: any): {
  day: string;
  topic: string;
  learnSec: number;
  restSec: number;
  scratchpad: string;
  notionPageId: string;
} {
  const props = page.properties || {};

  const day =
    props.Date?.title?.[0]?.plain_text || "";
  const topic =
    props.Topic?.rich_text?.[0]?.plain_text || "";
  const learnMin =
    typeof props["Focus (min)"]?.number === "number"
      ? props["Focus (min)"].number
      : typeof props["Focus (sec)"]?.number === "number"
      ? props["Focus (sec)"].number / 60
      : 0;
  const restMin =
    typeof props["Rest (min)"]?.number === "number"
      ? props["Rest (min)"].number
      : typeof props["Rest (sec)"]?.number === "number"
      ? props["Rest (sec)"].number / 60
      : 0;
  const learnSec = Math.round(learnMin * 60);
  const restSec = Math.round(restMin * 60);
  const scratchpad =
    props.Scratchpad?.rich_text?.[0]?.plain_text || "";

  return {
    day,
    topic,
    learnSec,
    restSec,
    scratchpad,
    notionPageId: page.id,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
