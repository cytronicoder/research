import { NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";

export const runtime = "edge";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug: slugParam } = await params;
  const slug = (slugParam || "").trim().toLowerCase();
  if (!slug) return new NextResponse("OK", { status: 200 });

  const redis = await getRedisClient();
  const target = await redis.get(`link:${slug}`);
  if (!target)
    return new NextResponse("Not found", {
      status: 404,
      headers: { "X-Robots-Tag": "noindex" },
    });

  // count click (best-effort; don't block redirect if it fails)
  try {
    await redis.incr(`count:${slug}`);
  } catch {}

  const res = NextResponse.redirect(target, 301);
  res.headers.set("X-Robots-Tag", "noindex");
  return res;
}
