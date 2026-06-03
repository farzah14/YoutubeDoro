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
    const payload = { day, topic, learnSec, restSec, notes: notes || [], scratchpad };
    const properties = buildPageProperties(payload);

    let pageId: string;

    if (existingPageId) {
      // ── UPDATE existing page ──
      await client.pages.update({
        page_id: existingPageId,
        properties: properties as Parameters<typeof client.pages.update>[0]["properties"],
      });

      // Delete old children and re-add (Notion doesn't support bulk child update)
      // We'll fetch existing children, archive them, and append new ones
      try {
        const existingChildren = await client.blocks.children.list({
          block_id: existingPageId,
          page_size: 100,
        });

        // Archive existing blocks
        for (const block of existingChildren.results) {
          try {
            await client.blocks.delete({ block_id: block.id });
          } catch {
            // Some blocks may not be deletable, skip
          }
        }
      } catch {
        // If we can't list/delete children, just continue with appending
      }

      // Append new children
      const children = buildPageChildren(payload);
      if (children.length > 0) {
        // Notion API allows max 100 blocks per request
        const batches = [];
        for (let i = 0; i < children.length; i += 100) {
          batches.push(children.slice(i, i + 100));
        }
        for (const batch of batches) {
          await client.blocks.children.append({
            block_id: existingPageId,
            children: batch as Parameters<typeof client.blocks.children.append>[0]["children"],
          });
        }
      }

      pageId = existingPageId;
    } else {
      // ── Check if page already exists for this day ──
      const query = await client.dataSources.query({
        data_source_id: targetDatabaseId,
        filter: {
          property: "Date",
          title: { equals: day },
        },
        page_size: 1,
      });

      if (query.results.length > 0) {
        // Page exists — update it
        const existing = query.results[0];
        pageId = existing.id;

        await client.pages.update({
          page_id: pageId,
          properties: properties as Parameters<typeof client.pages.update>[0]["properties"],
        });

        // Replace children
        try {
          const existingChildren = await client.blocks.children.list({
            block_id: pageId,
            page_size: 100,
          });
          for (const block of existingChildren.results) {
            try {
              await client.blocks.delete({ block_id: block.id });
            } catch {
              // skip
            }
          }
        } catch {
          // continue
        }

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
