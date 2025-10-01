import { NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function PUT(req: NextRequest) {
  if (req.headers.get("x-admin-key") !== process.env.ADMIN_KEY)
    return unauthorized();

  const { slug, target, permanent } = await req.json();
  if (!slug || !target)
    return NextResponse.json(
      { error: "slug and target required" },
      { status: 400 }
    );
  if (!/^https?:\/\//i.test(target))
    return NextResponse.json(
      { error: "target must start with http(s)://" },
      { status: 400 }
    );

  const redis = await getRedisClient();
  const key = slug.toLowerCase().replace(/^\//, "");
  await redis.set(`link:${key}`, target);
  await redis.hSet(`meta:${key}`, { permanent: !!permanent ? "1" : "0" });

  const origin = new URL(req.url).origin;
  return NextResponse.json({ slug: key, short: `${origin}/${key}`, target });
}

export async function GET(req: NextRequest) {
  // read link + stats (also protected)
  if (req.headers.get("x-admin-key") !== process.env.ADMIN_KEY)
    return unauthorized();
  const redis = await getRedisClient();
  const { searchParams } = new URL(req.url);
  const slug = (searchParams.get("slug") || "").toLowerCase();
  const target = slug ? await redis.get(`link:${slug}`) : null;
  const clicks = slug ? Number((await redis.get(`count:${slug}`)) || 0) : null;
  return NextResponse.json({ slug, target, clicks });
}

export async function DELETE(req: NextRequest) {
  if (req.headers.get("x-admin-key") !== process.env.ADMIN_KEY)
    return unauthorized();
  const redis = await getRedisClient();
  const { searchParams } = new URL(req.url);
  const slug = (searchParams.get("slug") || "").toLowerCase();
  await redis.del(`link:${slug}`);
  await redis.del(`count:${slug}`);
  return NextResponse.json({ deleted: slug });
}
