import { NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";

export async function GET() {
  try {
    const redis = await getRedisClient();
    
    // Get all keys that match the pattern "link:*"
    const keys = await redis.keys("link:*");
    
    // Fetch all links and their click counts
    const links = await Promise.all(
      keys.map(async (key) => {
        const slug = key.replace("link:", "");
        const target = await redis.get(key);
        const clicks = Number((await redis.get(`count:${slug}`)) || 0);
        
        // Fetch metadata
        const meta = await redis.hGetAll(`meta:${slug}`);
        
        return {
          slug,
          target,
          clicks,
          shortUrl: `/${slug}`,
          title: meta.title || null,
          description: meta.description || null,
          tags: meta.tags ? meta.tags.split(",") : [],
          createdAt: meta.createdAt || null,
        };
      })
    );

    // Sort by clicks descending
    links.sort((a, b) => b.clicks - a.clicks);

    return NextResponse.json({ links, total: links.length });
  } catch (error) {
    console.error("Error fetching directory:", error);
    return NextResponse.json(
      { error: "Failed to fetch links" },
      { status: 500 }
    );
  }
}
