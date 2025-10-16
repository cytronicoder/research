import { NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function PUT(req: NextRequest) {
  if (req.headers.get("x-admin-key") !== process.env.ADMIN_KEY)
    return unauthorized();

  const { oldTag, newTag } = await req.json();
  if (!oldTag || !newTag)
    return NextResponse.json(
      { error: "oldTag and newTag required" },
      { status: 400 }
    );

  try {
    const redis = await getRedisClient();
    const keys = await redis.keys("link:*");

    let updatedCount = 0;

    for (const key of keys) {
      const slug = key.replace("link:", "");
      const meta = await redis.hGetAll(`meta:${slug}`);

      if (meta.tags) {
        const tags = meta.tags.split(",");
        const updatedTags = tags.map((tag) =>
          tag.trim() === oldTag.trim() ? newTag : tag
        );

        if (updatedTags.join(",") !== meta.tags) {
          await redis.hSet(`meta:${slug}`, { tags: updatedTags.join(",") });
          updatedCount++;
        }
      }
    }

    return NextResponse.json({
      message: `Renamed tag "${oldTag}" to "${newTag}" in ${updatedCount} entries`,
    });
  } catch (error) {
    console.error("Error renaming tag:", error);
    return NextResponse.json(
      { error: "Failed to rename tag" },
      { status: 500 }
    );
  }
}
