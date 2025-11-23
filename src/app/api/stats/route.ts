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
    const period = searchParams.get("period") || "all";

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

    const stats = {
      totalLinks: 0,
      totalClicks: 0,
      sources: { manual: 0, orcid: 0 },
      tags: {} as Record<string, number>,
      recentActivity: [] as Array<{
        slug: string;
        clicks: number;
        lastAccessed?: string;
      }>,
      topPerformers: [] as Array<{
        slug: string;
        clicks: number;
        title?: string;
      }>,
      period: period,
    };

    const now = new Date();
    const periodStart = new Date();

    switch (period) {
      case "week":
        periodStart.setDate(now.getDate() - 7);
        break;
      case "month":
        periodStart.setMonth(now.getMonth() - 1);
        break;
      case "year":
        periodStart.setFullYear(now.getFullYear() - 1);
        break;
      default:
        periodStart.setFullYear(2000);
    }

    for (let i = 0; i < keys.length; i++) {
      const slug = keys[i].replace("link:", "");
      const meta = pipelineResults[i * 2] as unknown as Record<
        string,
        string
      > | null;
      const clicks = pipelineResults[i * 2 + 1] as unknown as string | null;

      if (!meta) continue;

      const clickCount = Number(clicks || 0);
      const createdAt = meta.createdAt ? new Date(meta.createdAt) : null;

      stats.totalLinks++;
      stats.totalClicks += clickCount;

      if (slug.startsWith("orcid-")) stats.sources.orcid++;
      else stats.sources.manual++;

      if (meta.tags) {
        const tags = meta.tags.split(",");
        tags.forEach((tag) => {
          const trimmedTag = tag.trim();
          if (trimmedTag)
            stats.tags[trimmedTag] = (stats.tags[trimmedTag] || 0) + 1;
        });
      }

      if (createdAt && createdAt >= periodStart) {
        stats.recentActivity.push({
          slug,
          clicks: clickCount,
          lastAccessed: createdAt.toISOString(),
        });
      }

      stats.topPerformers.push({
        slug,
        clicks: clickCount,
        title: meta.title,
      });
    }

    stats.recentActivity.sort(
      (a, b) =>
        new Date(b.lastAccessed!).getTime() -
        new Date(a.lastAccessed!).getTime()
    );
    stats.recentActivity = stats.recentActivity.slice(0, 10);

    stats.topPerformers.sort((a, b) => b.clicks - a.clicks);
    stats.topPerformers = stats.topPerformers.slice(0, 10);

    const avgClicksPerLink =
      stats.totalLinks > 0
        ? Math.round((stats.totalClicks / stats.totalLinks) * 100) / 100
        : 0;
    const uniqueTags = Object.keys(stats.tags).length;

    return NextResponse.json({
      ...stats,
      avgClicksPerLink,
      uniqueTags,
      periodStart: periodStart.toISOString(),
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "failed to fetch stats" },
      { status: 500 }
    );
  }
}
