import { NextRequest, NextResponse } from "next/server";
import {
  getNotionClient,
  buildPageProperties,
  buildPageChildren,
} from "@/lib/notion";
import type { DailyNoteEntry } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      token,
      databaseId,
      day,
      topic,
      learnSec,
      restSec,
      notes,
      scratchpad,
      existingPageId,
    } = body as {
      token?: string;
      databaseId?: string;
      day: string;
      topic: string;
      learnSec: number;
      restSec: number;
      notes: DailyNoteEntry[];
      scratchpad?: string;
      existingPageId?: string;
    };

    const targetDatabaseId = databaseId || process.env.NOTION_DATABASE_ID;

    if (!targetDatabaseId || !day) {
      return NextResponse.json(
        { error: "Missing required fields: databaseId or NOTION_DATABASE_ID in env, day" },
        { status: 400 }
      );
    }

    const client = getNotionClient(token);
    // Filter notes to only include activities that match the current topic
    const topicNotes = (notes || []).filter(
      (n) => n.title === topic || (!n.title && (!topic || topic === "(No topic)"))
    );
    const payload = { day, topic, learnSec, restSec, notes: topicNotes, scratchpad };
    const properties = buildPageProperties(payload);

    // ── Check if page already exists for this day + topic ──
    const query = await client.dataSources.query({
      data_source_id: targetDatabaseId,
      filter: {
        and: [
          {
            property: "Date",
            title: { equals: day },
          },
          {
            property: "Topic",
            rich_text: { equals: topic || "(No topic)" },
          },
        ],
      },
      page_size: 1,
    });

    let pageId: string;
    const exists = query.results.length > 0;

    if (exists) {
      // ── UPDATE existing page ──
      const existing = query.results[0];
      pageId = existing.id;

      await client.pages.update({
        page_id: pageId,
        properties: properties as Parameters<typeof client.pages.update>[0]["properties"],
      });

      // Delete old children and re-add (Notion doesn't support bulk child update)
      try {
        const existingChildren = await client.blocks.children.list({
          block_id: pageId,
          page_size: 100,
        });

        // Archive existing blocks
        for (const block of existingChildren.results) {
          try {
            await client.blocks.delete({ block_id: block.id });
          } catch {
            // skip
          }
        }
      } catch {
        // skip
      }

      // Append new children
      const children = buildPageChildren(payload);
      if (children.length > 0) {
        const batches = [];
        for (let i = 0; i < children.length; i += 100) {
          batches.push(children.slice(i, i + 100));
        }
        for (const batch of batches) {
          await client.blocks.children.append({
            block_id: pageId,
            children: batch as Parameters<typeof client.blocks.children.append>[0]["children"],
          });
        }
      }
    } else {
      // ── CREATE new page ──
      const children = buildPageChildren(payload);
      const page = await client.pages.create({
        parent: { type: "data_source_id", data_source_id: targetDatabaseId },
        properties: properties as Parameters<typeof client.pages.create>[0]["properties"],
        children: children.slice(0, 100) as Parameters<typeof client.pages.create>[0]["children"],
      });

      pageId = page.id;

      // If more than 100 children, append the rest
      if (children.length > 100) {
        const remaining = children.slice(100);
        const batches = [];
        for (let i = 0; i < remaining.length; i += 100) {
          batches.push(remaining.slice(i, i + 100));
        }
        for (const batch of batches) {
          await client.blocks.children.append({
            block_id: pageId,
            children: batch as Parameters<typeof client.blocks.children.append>[0]["children"],
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      pageId,
      syncedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("[Notion Sync Error]", message);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
