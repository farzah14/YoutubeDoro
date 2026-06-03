import { NextRequest, NextResponse } from "next/server";
import { getNotionClient, parseNotionPage } from "@/lib/notion";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, databaseId, day } = body as {
      token?: string;
      databaseId?: string;
      day?: string;
    };

    const targetDatabaseId = databaseId || process.env.NOTION_DATABASE_ID;

    if (!targetDatabaseId) {
      return NextResponse.json(
        { error: "Missing required field: databaseId or NOTION_DATABASE_ID in env" },
        { status: 400 }
      );
    }

    const client = getNotionClient(token);

    if (day) {
      // ── Pull specific day ──
      const query = await client.dataSources.query({
        data_source_id: targetDatabaseId,
        filter: {
          property: "Date",
          title: { equals: day },
        },
        page_size: 1,
      });

      if (query.results.length === 0) {
        return NextResponse.json({
          success: true,
          data: null,
          message: `No data found for ${day}`,
        });
      }

      const page = query.results[0];
      const data = parseNotionPage(page);

      return NextResponse.json({
        success: true,
        data,
      });
    } else {
      // ── Pull recent days ──
      // Query all pages, sorted by last edited
      const query = await client.dataSources.query({
        data_source_id: targetDatabaseId,
        sorts: [
          { property: "Last Synced", direction: "descending" },
        ],
        page_size: 14,
      });

      const results = query.results.map(parseNotionPage);

      return NextResponse.json({
        success: true,
        data: results,
      });
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("[Notion Pull Error]", message);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
