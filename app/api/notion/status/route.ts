import { NextRequest, NextResponse } from "next/server";
import { getNotionClient } from "@/lib/notion";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { token, databaseId } = body as {
      token?: string;
      databaseId?: string;
    };

    const targetToken = token || "env";
    const targetDatabaseId = databaseId || process.env.NOTION_DATABASE_ID;

    const client = getNotionClient(targetToken);

    // Test connection
    const me = await client.users.me({});

    // Check database if provided
    let dbInfo = null;
    if (targetDatabaseId) {
      try {
        const db = await client.dataSources.retrieve({
          data_source_id: targetDatabaseId,
        });
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const dbAny = db as any;
        const titleText = dbAny?.title?.[0]?.plain_text || "Untitled";
        /* eslint-enable @typescript-eslint/no-explicit-any */
        dbInfo = {
          id: db.id,
          title: titleText,
        };
      } catch {
        dbInfo = null;
      }
    }

    return NextResponse.json({
      connected: true,
      user: {
        name: me.name,
        type: me.type,
        avatarUrl: me.avatar_url,
      },
      database: dbInfo,
      envConfigured: !!process.env.NOTION_TOKEN && !!process.env.NOTION_DATABASE_ID,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      { connected: false, error: message },
      { status: 500 }
    );
  }
}
