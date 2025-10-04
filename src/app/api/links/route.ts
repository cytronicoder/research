import { NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function PUT(req: NextRequest) {
  if (req.headers.get("x-admin-key") !== process.env.ADMIN_KEY)
    return unauthorized();

  const { slug, target, permanent, title, description, tags } =
    await req.json();
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

  const metadata: Record<string, string> = {
    permanent: !!permanent ? "1" : "0",
    createdAt: new Date().toISOString(),
  };

  if (title) metadata.title = title;
  if (description) metadata.description = description;
  if (tags) metadata.tags = Array.isArray(tags) ? tags.join(",") : tags;

  await redis.hSet(`meta:${key}`, metadata);

  const origin = new URL(req.url).origin;
  return NextResponse.json({
    slug: key,
    short: `${origin}/${key}`,
    target,
    title: metadata.title,
    description: metadata.description,
    tags: metadata.tags,
  });
}

export async function GET(req: NextRequest) {
  if (req.headers.get("x-admin-key") !== process.env.ADMIN_KEY)
    return unauthorized();
  const redis = await getRedisClient();
  const { searchParams } = new URL(req.url);
  const slug = (searchParams.get("slug") || "").toLowerCase();
  const target = slug ? await redis.get(`link:${slug}`) : null;
  const clicks = slug ? Number((await redis.get(`count:${slug}`)) || 0) : null;

  let metadata = null;
  if (slug) {
    const meta = await redis.hGetAll(`meta:${slug}`);
    metadata = {
      permanent: meta.permanent === "1",
      title: meta.title || null,
      description: meta.description || null,
      tags: meta.tags ? meta.tags.split(",") : [],
      createdAt: meta.createdAt || null,
    };
  }

  return NextResponse.json({ slug, target, clicks, metadata });
}

export async function DELETE(req: NextRequest) {
  if (req.headers.get("x-admin-key") !== process.env.ADMIN_KEY)
    return unauthorized();
  const redis = await getRedisClient();
  const { searchParams } = new URL(req.url);
  const slug = (searchParams.get("slug") || "").toLowerCase();
  await redis.del(`link:${slug}`);
  await redis.del(`count:${slug}`);
  await redis.del(`meta:${slug}`);
  return NextResponse.json({ deleted: slug });
}
