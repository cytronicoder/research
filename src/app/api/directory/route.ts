import { getRedisClient } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const redis = await getRedisClient();
    const { searchParams } = new URL(req.url);
    const tag = searchParams.get("tag");
    const source = searchParams.get("source");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const offset = parseInt(searchParams.get("offset") || "0");

    const keys = await redis.keys("link:*");

    const links = await Promise.all(
      keys.map(async (key) => {
        const slug = key.replace("link:", "");
        const target = await redis.get(key);
        const clicks = Number((await redis.get(`count:${slug}`)) || 0);
        const meta = await redis.hGetAll(`meta:${slug}`);

        return {
          slug,
          target,
          clicks,
          shortUrl: `/${slug}`,
          title: meta.title || null,
          description: meta.description || null,
          tags: meta.tags ? meta.tags.split(",").filter(Boolean) : [],
          createdAt: meta.createdAt || null,
        };
      })
    );

    let filteredLinks = links;

    if (tag) {
      filteredLinks = filteredLinks.filter((link) =>
        link.tags.some((t) => t.toLowerCase().includes(tag.toLowerCase()))
      );
    }

    if (source) {
      if (source === "orcid") {
        filteredLinks = filteredLinks.filter((link) =>
          link.slug.startsWith("orcid-")
        );
      } else if (source === "manual") {
        filteredLinks = filteredLinks.filter(
          (link) => !link.slug.startsWith("orcid-")
        );
      }
    }

    filteredLinks.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    const total = filteredLinks.length;
    const paginatedLinks = filteredLinks.slice(offset, offset + limit);

    return NextResponse.json({
      links: paginatedLinks,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      filters: {
        tag: tag || null,
        source: source || null,
      },
    });
  } catch (error) {
    console.error("Error fetching directory:", error);
    return NextResponse.json(
      { error: "Failed to fetch links" },
      { status: 500 }
    );
  }
}
