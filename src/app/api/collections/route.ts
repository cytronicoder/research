import { NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

function isValidCollectionId(id: string): boolean {
  return /^[a-z0-9-_]+$/i.test(id);
}

export async function GET(req: NextRequest) {
  if (req.headers.get("x-admin-key") !== process.env.ADMIN_KEY) {
    return unauthorized();
  }
  try {
    const redis = await getRedisClient();
    const keys = await redis.keys("collection:*");

    const collections = await Promise.all(
      keys.map(async (key) => {
        const id = key.replace("collection:", "");
        const data = await redis.hGetAll(key);
        return {
          id,
          name: data.name || "",
          description: data.description || "",
          projects: data.projects
            ? data.projects.split(",").filter(Boolean)
            : [],
          tags: data.tags ? data.tags.split(",").filter(Boolean) : [],
          createdAt: data.createdAt || null,
          updatedAt: data.updatedAt || null,
        };
      })
    );

    return NextResponse.json({ collections });
  } catch (error) {
    console.error("Error fetching collections:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (req.headers.get("x-admin-key") !== process.env.ADMIN_KEY) {
    return unauthorized();
  }

  try {
    const body = await req.json();
    const { id, name, description, projects, tags } = body;

    if (!id || !name) {
      return NextResponse.json(
        { error: "id and name are required" },
        { status: 400 }
      );
    }

    if (!isValidCollectionId(id)) {
      return NextResponse.json(
        {
          error:
            "id must contain only alphanumeric characters, hyphens, and underscores",
        },
        { status: 400 }
      );
    }

    const redis = await getRedisClient();
    const key = `collection:${id}`;

    const exists = await redis.exists(key);
    if (exists) {
      return NextResponse.json(
        { error: "collection already exists" },
        { status: 409 }
      );
    }

    const data: Record<string, string> = {
      name,
      description: description || "",
      projects: Array.isArray(projects) ? projects.join(",") : projects || "",
      tags: Array.isArray(tags) ? tags.join(",") : tags || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await redis.hSet(key, data);

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Error saving collection:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  if (req.headers.get("x-admin-key") !== process.env.ADMIN_KEY) {
    return unauthorized();
  }

  try {
    const body = await req.json();
    const { id, name, description, projects, tags } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    if (!isValidCollectionId(id)) {
      return NextResponse.json(
        {
          error:
            "id must contain only alphanumeric characters, hyphens, and underscores",
        },
        { status: 400 }
      );
    }

    const redis = await getRedisClient();
    const key = `collection:${id}`;

    const exists = await redis.exists(key);
    if (!exists) {
      return NextResponse.json(
        { error: "collection not found" },
        { status: 404 }
      );
    }

    const updates: Record<string, string> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description || "";
    if (projects !== undefined)
      updates.projects = Array.isArray(projects)
        ? projects.join(",")
        : projects || "";
    if (tags !== undefined)
      updates.tags = Array.isArray(tags) ? tags.join(",") : tags || "";

    updates.updatedAt = new Date().toISOString();

    await redis.hSet(key, updates);

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Error updating collection:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (req.headers.get("x-admin-key") !== process.env.ADMIN_KEY) {
    return unauthorized();
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  if (!isValidCollectionId(id)) {
    return NextResponse.json(
      {
        error:
          "id must contain only alphanumeric characters, hyphens, and underscores",
      },
      { status: 400 }
    );
  }

  try {
    const redis = await getRedisClient();
    await redis.del(`collection:${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting collection:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
