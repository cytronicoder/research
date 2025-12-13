import { getRedisClient } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";

interface SearchResult {
  slug: string;
  target: string;
  title: string | null;
  description: string | null;
  tags: string[];
  startDate: string | null;
  endDate: string | null;
  githubRepo: string | null;
  source: "manual" | "orcid";
  score: number;
  highlights: {
    title?: string[];
    description?: string[];
    tags?: string[];
  };
}

function calculateRelevance(
  query: string,
  title: string,
  description: string,
  tags: string[]
): number {
  const queryLower = query.toLowerCase();
  let score = 0;

  if (title && title.toLowerCase().includes(queryLower)) {
    score += 10;
    if (title.toLowerCase().startsWith(queryLower)) score += 5;
  }

  if (description && description.toLowerCase().includes(queryLower)) {
    score += 5;
  }

  tags.forEach((tag) => {
    if (tag.toLowerCase().includes(queryLower)) {
      score += 3;
    }
  });

  return score;
}

function highlightText(text: string, query: string): string[] {
  if (!text) return [];

  const regex = new RegExp(
    `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi"
  );
  const matches = text.match(regex);
  return matches || [];
}

export async function GET(req: NextRequest) {
  try {
    const redis = await getRedisClient();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    const tagParam = searchParams.get("tag");
    const source = searchParams.get("source");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    const tags = tagParam
      ? tagParam
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    if (!query && tags.length === 0 && !source) {
      return NextResponse.json(
        {
          error:
            "At least one search parameter required: q (query), tag, or source",
        },
        { status: 400 }
      );
    }

    const keys = await redis.keys("link:*");

    const pipeline = redis.multi();
    for (const key of keys) {
      const slug = key.replace("link:", "");
      pipeline.get(key);
      pipeline.hGetAll(`meta:${slug}`);
    }

    const pipelineResults = await pipeline.exec();
    if (!pipelineResults) {
      throw new Error("Pipeline execution failed");
    }

    const results: SearchResult[] = [];

    for (let i = 0; i < keys.length; i++) {
      const slug = keys[i].replace("link:", "");
      const target = pipelineResults[i * 2] as unknown as string | null;
      const meta = pipelineResults[i * 2 + 1] as unknown as Record<
        string,
        string
      > | null;

      if (!target || !meta) continue;

      const title = meta.title || "";
      const description = meta.description || "";
      const entryTags = meta.tags
        ? meta.tags.split(",").map((t) => t.trim())
        : [];

      let entrySource: "manual" | "orcid" = "manual";
      if (slug.startsWith("orcid-")) entrySource = "orcid";

      if (source && entrySource !== source) continue;

      if (tags.length > 0) {
        const hasMatchingTag = tags.some((searchTag) =>
          entryTags.some((entryTag) =>
            entryTag.toLowerCase().includes(searchTag.toLowerCase())
          )
        );
        if (!hasMatchingTag) continue;
      }

      const score = query
        ? calculateRelevance(query, title, description, entryTags)
        : 1;

      if (query && score === 0) continue;

      const highlights = {
        title: query ? highlightText(title, query) : [],
        description: query ? highlightText(description, query) : [],
        tags: query
          ? entryTags.filter((t) =>
              t.toLowerCase().includes(query.toLowerCase())
            )
          : [],
      };

      results.push({
        slug,
        target,
        title: title || null,
        description: description || null,
        tags: entryTags,
        startDate: meta.startDate || null,
        endDate: meta.endDate || null,
        githubRepo: meta.githubRepo || null,
        source: entrySource,
        score,
        highlights,
      });
    }

    results.sort((a, b) => b.score - a.score);

    const paginatedResults = results.slice(offset, offset + limit);
    const total = results.length;

    return NextResponse.json(
      {
        query: query || null,
        filters: { tags: tags.length > 0 ? tags : null, source },
        results: paginatedResults,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("Error performing search:", error);
    return NextResponse.json(
      { error: "failed to perform search" },
      { status: 500 }
    );
  }
}
