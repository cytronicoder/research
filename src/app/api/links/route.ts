import { NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function POST(req: NextRequest) {
  if (req.headers.get("x-admin-key") !== process.env.ADMIN_KEY)
    return unauthorized();

  const { links } = await req.json();
  if (!links || !Array.isArray(links))
    return NextResponse.json(
      { error: "links array required" },
      { status: 400 }
    );

  const redis = await getRedisClient();
  const results = [];
  const origin = new URL(req.url).origin;

  for (const link of links) {
    const { slug, target, permanent, title, description, tags } = link;
    if (!slug || !target) {
      results.push({ slug, error: "slug and target required" });
      continue;
    }
    if (!/^https?:\/\//i.test(target)) {
      results.push({ slug, error: "target must start with http(s)://" });
      continue;
    }

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

    results.push({
      slug: key,
      short: `${origin}/${key}`,
      target,
      title: metadata.title,
      description: metadata.description,
      tags: metadata.tags,
    });
  }

  return NextResponse.json({ results });
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

  if (slug) {
    const target = await redis.get(`link:${slug}`);
    const clicks = Number((await redis.get(`count:${slug}`)) || 0);

    let metadata = null;
    if (target) {
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

  const tag = searchParams.get("tag");
  const source = searchParams.get("source");
  const search = searchParams.get("search");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
  const offset = parseInt(searchParams.get("offset") || "0");

  const keys = await redis.keys("link:*");
  console.log(`Found ${keys.length} keys in Redis:`, keys);
  const results = [];

  for (const key of keys) {
    const slug = key.replace("link:", "");
    const target = await redis.get(key);
    const clicks = Number((await redis.get(`count:${slug}`)) || 0);
    const meta = await redis.hGetAll(`meta:${slug}`);

    const entry = {
      slug,
      target,
      clicks,
      metadata: {
        permanent: meta.permanent === "1",
        title: meta.title || null,
        description: meta.description || null,
        tags: meta.tags ? meta.tags.split(",") : [],
        createdAt: meta.createdAt || null,
      },
    };

    if (tag && !entry.metadata.tags.includes(tag)) continue;
    if (source && !slug.startsWith(`${source}-`)) continue;
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesTitle = entry.metadata.title
        ?.toLowerCase()
        .includes(searchLower);
      const matchesDesc = entry.metadata.description
        ?.toLowerCase()
        .includes(searchLower);
      const matchesTags = entry.metadata.tags.some((t) =>
        t.toLowerCase().includes(searchLower)
      );
      if (!matchesTitle && !matchesDesc && !matchesTags) continue;
    }

    results.push(entry);
  }

  results.sort((a, b) => {
    const dateA = new Date(a.metadata.createdAt || 0);
    const dateB = new Date(b.metadata.createdAt || 0);
    return dateB.getTime() - dateA.getTime();
  });

  const paginatedResults = results.slice(offset, offset + limit);
  const total = results.length;

  return NextResponse.json({
    links: paginatedResults,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  });
}

export async function PATCH(req: NextRequest) {
  if (req.headers.get("x-admin-key") !== process.env.ADMIN_KEY)
    return unauthorized();

  const { slugs, updates } = await req.json();
  if (!slugs || !Array.isArray(slugs) || !updates)
    return NextResponse.json(
      { error: "slugs array and updates object required" },
      { status: 400 }
    );

  const redis = await getRedisClient();
  const results = [];

  for (const slug of slugs) {
    const key = slug.toLowerCase().replace(/^\//, "");
    const existingMeta = await redis.hGetAll(`meta:${key}`);

    if (Object.keys(existingMeta).length === 0) {
      results.push({ slug, error: "not found" });
      continue;
    }

    const updatedMeta = { ...existingMeta };

    if (updates.title !== undefined) updatedMeta.title = updates.title;
    if (updates.description !== undefined)
      updatedMeta.description = updates.description;
    if (updates.tags !== undefined) {
      updatedMeta.tags = Array.isArray(updates.tags)
        ? updates.tags.join(",")
        : updates.tags;
    }
    if (updates.permanent !== undefined) {
      updatedMeta.permanent = updates.permanent ? "1" : "0";
    }
    if (updates.target) {
      await redis.set(`link:${key}`, updates.target);
    }

    await redis.hSet(`meta:${key}`, updatedMeta);

    results.push({
      slug: key,
      updated: true,
      metadata: {
        permanent: updatedMeta.permanent === "1",
        title: updatedMeta.title || null,
        description: updatedMeta.description || null,
        tags: updatedMeta.tags ? updatedMeta.tags.split(",") : [],
        createdAt: updatedMeta.createdAt || null,
      },
    });
  }

  return NextResponse.json({ results });
}

export async function DELETE(req: NextRequest) {
  if (req.headers.get("x-admin-key") !== process.env.ADMIN_KEY)
    return unauthorized();

  const redis = await getRedisClient();
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const slugs = searchParams.get("slugs");

  if (slug) {
    const key = slug.toLowerCase().replace(/^\//, "");
    const exists = await redis.exists(`link:${key}`);
    console.log(`Deleting link:${key}, exists: ${exists}`);
    const deletedLink = await redis.del(`link:${key}`);
    const deletedCount = await redis.del(`count:${key}`);
    const deletedMeta = await redis.del(`meta:${key}`);

    console.log(
      `Deleted keys - link: ${deletedLink}, count: ${deletedCount}, meta: ${deletedMeta}`
    );

    return NextResponse.json({
      deleted: [key],
      existed: exists > 0,
      keysDeleted: {
        link: deletedLink,
        count: deletedCount,
        meta: deletedMeta,
      },
    });
  } else if (slugs) {
    const slugArray = slugs.split(",");
    const deleted = [];
    const results = [];

    for (const s of slugArray) {
      const key = s.trim().toLowerCase().replace(/^\//, "");
      const exists = await redis.exists(`link:${key}`);
      console.log(`Deleting link:${key}, exists: ${exists}`);
      const deletedLink = await redis.del(`link:${key}`);
      const deletedCount = await redis.del(`count:${key}`);
      const deletedMeta = await redis.del(`meta:${key}`);

      console.log(
        `Deleted keys - link: ${deletedLink}, count: ${deletedCount}, meta: ${deletedMeta}`
      );

      deleted.push(key);
      results.push({
        key,
        existed: exists > 0,
        keysDeleted: {
          link: deletedLink,
          count: deletedCount,
          meta: deletedMeta,
        },
      });
    }

    return NextResponse.json({ deleted, results });
  } else {
    return NextResponse.json(
      { error: "slug or slugs parameter required" },
      { status: 400 }
    );
  }
}
