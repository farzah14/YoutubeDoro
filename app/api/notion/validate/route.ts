import { NextRequest, NextResponse } from "next/server";
import { getNotionClient, createNotionDatabase } from "@/lib/notion";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, parentPageId } = body as {
      token?: string;
      parentPageId?: string;
    };

    if (!token) {
      return NextResponse.json(
        { error: "Notion token is required" },
        { status: 400 }
      );
    }

    const client = getNotionClient(token);

    // Test connection by fetching user info
    const me = await client.users.me({});

    let databaseId: string | null = null;

    // If parentPageId is provided, create a new database
    if (parentPageId) {
      const db = await createNotionDatabase(client, parentPageId);
      // In SDK v5+, we need the data_source_id for queries, not the database_id
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const dbAny = db as any;
      const dataSources = dbAny?.data_sources;
      databaseId = dataSources?.[0]?.id || db.id;
      /* eslint-enable @typescript-eslint/no-explicit-any */
    }

    return NextResponse.json({
      valid: true,
      user: {
        name: me.name,
        type: me.type,
        avatarUrl: me.avatar_url,
      },
      databaseId,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    // Detect common Notion API errors
    if (message.includes("Could not find user") || message.includes("API token is invalid")) {
      return NextResponse.json(
        { valid: false, error: "Invalid Notion token. Please check your integration token." },
        { status: 401 }
      );
    }
    if (message.includes("Could not find page") || message.includes("object_not_found")) {
      return NextResponse.json(
        { valid: false, error: "Page not found. Make sure the page is shared with your integration." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { valid: false, error: message },
      { status: 500 }
    );
  }
}
