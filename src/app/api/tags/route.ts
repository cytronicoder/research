import { NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  if (req.headers.get("x-admin-key") !== process.env.ADMIN_KEY)
    return unauthorized();

  try {
    const redis = await getRedisClient();
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "stats") {
      const keys = await redis.keys("link:*");

      const pipeline = redis.multi();
      for (const key of keys) {
        const slug = key.replace("link:", "");
        pipeline.hGetAll(`meta:${slug}`);
        pipeline.get(`count:${slug}`);
      }

      const pipelineResults = await pipeline.exec();
      if (!pipelineResults) {
        throw new Error("Pipeline execution failed");
      }

      const tagCounts: Record<string, number> = {};
      const sourceCounts: Record<string, number> = {
        manual: 0,
        orcid: 0,
      };
      let totalClicks = 0;
      let totalLinks = 0;

      for (let i = 0; i < keys.length; i++) {
        const slug = keys[i].replace("link:", "");
        const meta = pipelineResults[i * 2] as unknown as Record<
          string,
          string
        > | null;
        const clicks = pipelineResults[i * 2 + 1] as unknown as string | null;

        if (!meta) continue;

        totalLinks++;
        totalClicks += Number(clicks || 0);

        if (meta.tags) {
          const tags = meta.tags.split(",");
          tags.forEach((tag) => {
            const trimmedTag = tag.trim();
            if (trimmedTag)
              tagCounts[trimmedTag] = (tagCounts[trimmedTag] || 0) + 1;
          });
        }

        if (slug.startsWith("orcid-")) sourceCounts.orcid++;
        else sourceCounts.manual++;
      }

      const sortedTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20);

      return NextResponse.json({
        totalLinks,
        totalClicks,
        sources: sourceCounts,
        topTags: sortedTags,
        uniqueTags: Object.keys(tagCounts).length,
      });
    } else if (action === "suggest") {
      const prefix = searchParams.get("prefix") || "";
      const keys = await redis.keys("link:*");

      const pipeline = redis.multi();
      for (const key of keys) {
        const slug = key.replace("link:", "");
        pipeline.hGetAll(`meta:${slug}`);
      }

      const pipelineResults = await pipeline.exec();
      if (!pipelineResults) {
        throw new Error("Pipeline execution failed");
      }

      const tagSet = new Set<string>();

      for (let i = 0; i < keys.length; i++) {
        const meta = pipelineResults[i] as unknown as Record<
          string,
          string
        > | null;

        if (!meta) continue;

        if (meta.tags) {
          const tags = meta.tags.split(",");
          tags.forEach((tag) => {
            const trimmedTag = tag.trim();
            if (
              trimmedTag &&
              trimmedTag.toLowerCase().startsWith(prefix.toLowerCase())
            ) {
              tagSet.add(trimmedTag);
            }
          });
        }
      }

      return NextResponse.json({
        suggestions: Array.from(tagSet).sort().slice(0, 10),
      });
    }

    return NextResponse.json(
      {
        error:
          "Invalid action. Use ?action=stats or ?action=suggest&prefix=...",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in tags endpoint:", error);
    return NextResponse.json(
      { error: "failed to process tags request" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (req.headers.get("x-admin-key") !== process.env.ADMIN_KEY)
    return unauthorized();

  const { slugs, tags } = await req.json();
  if (!slugs || !Array.isArray(slugs) || !tags || !Array.isArray(tags))
    return NextResponse.json(
      { error: "slugs (array) and tags (array) required" },
      { status: 400 }
    );

  try {
    const redis = await getRedisClient();
    let updatedCount = 0;

    for (const slug of slugs) {
      const meta = await redis.hGetAll(`meta:${slug}`);
      const existingTags = meta.tags
        ? meta.tags.split(",").map((t) => t.trim())
        : [];
      const newTags = [...new Set([...existingTags, ...tags])];

      if (newTags.length !== existingTags.length) {
        await redis.hSet(`meta:${slug}`, { tags: newTags.join(",") });
        updatedCount++;
      }
    }

    return NextResponse.json({
      message: `Added tags ${tags.join(", ")} to ${updatedCount} entries`,
    });
  } catch (error) {
    console.error("Error adding tags:", error);
    return NextResponse.json({ error: "Failed to add tags" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (req.headers.get("x-admin-key") !== process.env.ADMIN_KEY)
    return unauthorized();

  const { slugs, tags } = await req.json();
  if (!slugs || !Array.isArray(slugs) || !tags || !Array.isArray(tags))
    return NextResponse.json(
      { error: "slugs (array) and tags (array) required" },
      { status: 400 }
    );

  try {
    const redis = await getRedisClient();
    let updatedCount = 0;

    for (const slug of slugs) {
      const meta = await redis.hGetAll(`meta:${slug}`);
      if (meta.tags) {
        const existingTags = meta.tags.split(",").map((t) => t.trim());
        const filteredTags = existingTags.filter((tag) => !tags.includes(tag));

        if (filteredTags.length !== existingTags.length) {
          await redis.hSet(`meta:${slug}`, { tags: filteredTags.join(",") });
          updatedCount++;
        }
      }
    }

    return NextResponse.json({
      message: `Removed tags ${tags.join(", ")} from ${updatedCount} entries`,
    });
  } catch (error) {
    console.error("Error removing tags:", error);
    return NextResponse.json(
      { error: "Failed to remove tags" },
      { status: 500 }
    );
  }
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

export async function DELETE(req: NextRequest) {
  if (req.headers.get("x-admin-key") !== process.env.ADMIN_KEY)
    return unauthorized();

  const { tag } = await req.json();
  if (!tag)
    return NextResponse.json({ error: "tag required" }, { status: 400 });

  try {
    const redis = await getRedisClient();
    const keys = await redis.keys("link:*");

    let updatedCount = 0;

    for (const key of keys) {
      const slug = key.replace("link:", "");
      const meta = await redis.hGetAll(`meta:${slug}`);

      if (meta.tags) {
        const tags = meta.tags.split(",");
        const filteredTags = tags.filter((t) => t.trim() !== tag.trim());

        if (filteredTags.length !== tags.length) {
          await redis.hSet(`meta:${slug}`, { tags: filteredTags.join(",") });
          updatedCount++;
        }
      }
    }

    return NextResponse.json({
      message: `Removed tag "${tag}" from ${updatedCount} entries`,
    });
  } catch (error) {
    console.error("Error removing tag:", error);
    return NextResponse.json(
      { error: "Failed to remove tag" },
      { status: 500 }
    );
  }
}
