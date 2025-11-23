import { NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

interface LinkMetadata {
  permanent: boolean;
  title: string | null;
  description: string | null;
  tags: string[];
  createdAt: string | null;
  updatedAt?: string | null;
}

interface LinkData {
  slug: string;
  target: string;
  clicks: number;
  metadata: LinkMetadata;
}

function parseMetadata(meta: Record<string, string>): LinkMetadata {
  return {
    permanent: meta.permanent === "1",
    title: meta.title || null,
    description: meta.description || null,
    tags: meta.tags ? meta.tags.split(",").filter((t) => t.trim()) : [],
    createdAt: meta.createdAt || null,
    updatedAt: meta.updatedAt || null,
  };
}

function prepareMetadata(
  data: {
    permanent?: boolean;
    title?: string;
    description?: string;
    tags?: string[] | string;
  },
  isUpdate: boolean = false
): Record<string, string> {
  const metadata: Record<string, string> = {};

  if (data.permanent !== undefined) {
    metadata.permanent = data.permanent ? "1" : "0";
  }
  if (data.title !== undefined) {
    metadata.title = data.title || "";
  }
  if (data.description !== undefined) {
    metadata.description = data.description || "";
  }
  if (data.tags !== undefined) {
    metadata.tags = Array.isArray(data.tags)
      ? data.tags.filter((t) => t.trim()).join(",")
      : data.tags;
  }

  if (isUpdate) {
    metadata.updatedAt = new Date().toISOString();
  } else {
    metadata.createdAt = new Date().toISOString();
  }

  return metadata;
}

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-_]+$/i.test(slug);
}

export async function POST(req: NextRequest) {
  if (req.headers.get("x-admin-key") !== process.env.ADMIN_KEY)
    return unauthorized();

  try {
    const body = await req.json();
    let linksToProcess: any[];

    if (body.links && Array.isArray(body.links)) {
      linksToProcess = body.links;
    } else if (body.slug && body.target) {
      linksToProcess = [body];
    } else {
      return NextResponse.json(
        { error: "links array or single link object required" },
        { status: 400 }
      );
    }

    const redis = await getRedisClient();
    const results = [];
    const origin = new URL(req.url).origin;

    for (const link of linksToProcess) {
      const { slug, target, permanent, title, description, tags } = link;
      if (!slug || !target) {
        results.push({ slug, error: "slug and target required" });
        continue;
      }

      const key = slug.toLowerCase().replace(/^\//, "");
      if (!isValidSlug(key)) {
        results.push({
          slug,
          error:
            "invalid slug format (use only letters, numbers, hyphens, underscores)",
        });
        continue;
      }

      if (!/^https?:\/\//i.test(target)) {
        results.push({ slug, error: "target must start with http(s)://" });
        continue;
      }

      try {
        const exists = await redis.exists(`link:${key}`);
        if (exists) {
          results.push({
            slug: key,
            error: "link already exists, use PUT to update",
          });
          continue;
        }

        const multi = redis.multi();
        multi.set(`link:${key}`, target);
        multi.set(`count:${key}`, "0");

        const metadata = prepareMetadata(
          { permanent, title, description, tags },
          false
        );
        multi.hSet(`meta:${key}`, metadata);

        await multi.exec();

        results.push({
          slug: key,
          short: `${origin}/${key}`,
          target,
          ...parseMetadata(metadata),
        });
      } catch (error) {
        console.error(`Error creating link ${key}:`, error);
        results.push({ slug: key, error: "failed to create link" });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error in POST /api/links:", error);
    return NextResponse.json(
      { error: "failed to process request" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  if (req.headers.get("x-admin-key") !== process.env.ADMIN_KEY)
    return unauthorized();

  try {
    const body = await req.json();
    let linksToProcess: any[] = [];

    if (Array.isArray(body)) {
      linksToProcess = body;
    } else if (body.links && Array.isArray(body.links)) {
      linksToProcess = body.links;
    } else if (body.slug) {
      linksToProcess = [body];
    } else {
      return NextResponse.json(
        { error: "slug or links array required" },
        { status: 400 }
      );
    }

    const redis = await getRedisClient();
    const results = [];
    const origin = new URL(req.url).origin;

    for (const linkData of linksToProcess) {
      const { slug, target, permanent, title, description, tags } = linkData;

      if (!slug) {
        results.push({ error: "slug required" });
        continue;
      }

      const key = slug.toLowerCase().replace(/^\//, "");

      if (!isValidSlug(key)) {
        results.push({
          slug,
          error:
            "invalid slug format (use only letters, numbers, hyphens, underscores)",
        });
        continue;
      }

      if (target && !/^https?:\/\//i.test(target)) {
        results.push({ slug, error: "target must start with http(s)://" });
        continue;
      }

      const exists = await redis.exists(`link:${key}`);
      if (!exists) {
        results.push({ slug: key, error: "link not found" });
        continue;
      }

      const existingMeta = await redis.hGetAll(`meta:${key}`);
      const multi = redis.multi();

      if (target) {
        multi.set(`link:${key}`, target);
      }

      const metadata = prepareMetadata(
        { permanent, title, description, tags },
        true
      );

      if (existingMeta.createdAt) {
        metadata.createdAt = existingMeta.createdAt;
      }

      multi.hSet(`meta:${key}`, metadata);
      await multi.exec();

      const finalTarget = target || (await redis.get(`link:${key}`));

      results.push({
        slug: key,
        short: `${origin}/${key}`,
        target: finalTarget,
        ...parseMetadata(metadata),
      });
    }

    if (
      linksToProcess.length === 1 &&
      body.slug &&
      !body.links &&
      !Array.isArray(body)
    ) {
      return NextResponse.json(results[0]);
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error updating link:", error);
    return NextResponse.json(
      { error: "failed to update link" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  if (req.headers.get("x-admin-key") !== process.env.ADMIN_KEY)
    return unauthorized();

  const redis = await getRedisClient();
  const { searchParams } = new URL(req.url);
  const slug = (searchParams.get("slug") || "").toLowerCase();

  if (slug) {
    try {
      const [target, clicks, meta] = await Promise.all([
        redis.get(`link:${slug}`),
        redis.get(`count:${slug}`),
        redis.hGetAll(`meta:${slug}`),
      ]);

      if (!target) {
        return NextResponse.json({ error: "link not found" }, { status: 404 });
      }

      return NextResponse.json({
        slug,
        target,
        clicks: Number(clicks || 0),
        metadata: parseMetadata(meta),
      });
    } catch (error) {
      console.error(`Error fetching link ${slug}:`, error);
      return NextResponse.json(
        { error: "failed to fetch link" },
        { status: 500 }
      );
    }
  }

  const tag = searchParams.get("tag");
  const source = searchParams.get("source");
  const search = searchParams.get("search");
  const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 200);
  const offset = parseInt(searchParams.get("offset") || "0");

  try {
    const keys = await redis.keys("link:*");
    console.log(`Found ${keys.length} keys in Redis`);
    const pipeline = redis.multi();
    for (const key of keys) {
      const slug = key.replace("link:", "");
      pipeline.get(key);
      pipeline.get(`count:${slug}`);
      pipeline.hGetAll(`meta:${slug}`);
    }

    const pipelineResults = await pipeline.exec();
    if (!pipelineResults) {
      throw new Error("Pipeline execution failed");
    }

    const results: LinkData[] = [];
    for (let i = 0; i < keys.length; i++) {
      const slug = keys[i].replace("link:", "");
      const target = pipelineResults[i * 3] as unknown as string | null;
      const clicks = pipelineResults[i * 3 + 1] as unknown as string | null;
      const meta = pipelineResults[i * 3 + 2] as unknown as Record<
        string,
        string
      > | null;

      if (!target || !meta) continue;

      const entry: LinkData = {
        slug,
        target,
        clicks: Number(clicks || 0),
        metadata: parseMetadata(meta),
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
        const matchesSlug = slug.toLowerCase().includes(searchLower);
        if (!matchesTitle && !matchesDesc && !matchesTags && !matchesSlug)
          continue;
      }

      results.push(entry);
    }

    results.sort((a, b) => {
      const dateA = new Date(a.metadata.createdAt || 0).getTime();
      const dateB = new Date(b.metadata.createdAt || 0).getTime();
      return dateB - dateA;
    });

    const total = results.length;
    const paginatedResults = results.slice(offset, offset + limit);

    return NextResponse.json({
      links: paginatedResults,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching links:", error);
    return NextResponse.json(
      { error: "failed to fetch links" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  if (req.headers.get("x-admin-key") !== process.env.ADMIN_KEY)
    return unauthorized();

  try {
    const body = await req.json();
    const { updates } = body;

    if (!updates) {
      return NextResponse.json(
        { error: "updates object required" },
        { status: 400 }
      );
    }

    const redis = await getRedisClient();
    let slugsToUpdate: string[] = [];

    if (body.slug) slugsToUpdate.push(body.slug);
    if (body.slugs && Array.isArray(body.slugs))
      slugsToUpdate.push(...body.slugs);

    if (body.tag) {
      const keys = await redis.keys("link:*");
      const pipeline = redis.multi();
      for (const key of keys) {
        const s = key.replace("link:", "");
        pipeline.hGetAll(`meta:${s}`);
      }
      const metas = await pipeline.exec();

      if (metas) {
        keys.forEach((key, index) => {
          const meta = metas[index] as unknown as Record<string, string>;
          const tags = meta.tags
            ? meta.tags.split(",").map((t) => t.trim())
            : [];
          if (tags.includes(body.tag)) {
            slugsToUpdate.push(key.replace("link:", ""));
          }
        });
      }
    }

    slugsToUpdate = Array.from(new Set(slugsToUpdate));

    if (slugsToUpdate.length === 0) {
      return NextResponse.json(
        { error: "slug, slugs, or tag required (or no matching links found)" },
        { status: 400 }
      );
    }

    const results = [];

    for (const slug of slugsToUpdate) {
      try {
        const key = slug.toLowerCase().replace(/^\//, "");

        const [exists, existingMeta] = await Promise.all([
          redis.exists(`link:${key}`),
          redis.hGetAll(`meta:${key}`),
        ]);

        if (!exists || Object.keys(existingMeta).length === 0) {
          results.push({ slug: key, error: "not found" });
          continue;
        }

        const updatedMeta = { ...existingMeta };

        if (updates.title !== undefined) {
          updatedMeta.title = updates.title || "";
        }
        if (updates.description !== undefined) {
          updatedMeta.description = updates.description || "";
        }
        if (updates.tags !== undefined) {
          updatedMeta.tags = Array.isArray(updates.tags)
            ? updates.tags.filter((t: string) => t.trim()).join(",")
            : updates.tags;
        }
        if (updates.permanent !== undefined) {
          updatedMeta.permanent = updates.permanent ? "1" : "0";
        }

        updatedMeta.updatedAt = new Date().toISOString();

        const multi = redis.multi();

        if (updates.target) {
          if (!/^https?:\/\//i.test(updates.target)) {
            results.push({ slug: key, error: "invalid target URL" });
            continue;
          }
          multi.set(`link:${key}`, updates.target);
        }

        multi.hSet(`meta:${key}`, updatedMeta);
        await multi.exec();

        results.push({
          slug: key,
          updated: true,
          metadata: parseMetadata(updatedMeta),
        });
      } catch (error) {
        console.error(`Error updating link ${slug}:`, error);
        results.push({ slug, error: "failed to update" });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error in PATCH /api/links:", error);
    return NextResponse.json(
      { error: "failed to process request" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (req.headers.get("x-admin-key") !== process.env.ADMIN_KEY)
    return unauthorized();

  const redis = await getRedisClient();
  const { searchParams } = new URL(req.url);

  let slug = searchParams.get("slug");
  let slugs = searchParams.get("slugs")
    ? searchParams
        .get("slugs")!
        .split(",")
        .map((s) => s.trim())
    : [];
  let tag = searchParams.get("tag");

  try {
    const body = await req.json();
    if (body.slug) slug = body.slug;
    if (body.slugs) {
      const bodySlugs = Array.isArray(body.slugs)
        ? body.slugs
        : body.slugs.split(",");
      slugs = [...slugs, ...bodySlugs];
    }
    if (body.tag) tag = body.tag;
  } catch (error) {
    // Ignore JSON parse error (empty body)
  }

  if (!slug && slugs.length === 0 && !tag) {
    return NextResponse.json(
      { error: "slug, slugs, or tag parameter required" },
      { status: 400 }
    );
  }

  const keysToDelete: string[] = [];

  if (slug) keysToDelete.push(slug.toLowerCase().replace(/^\//, ""));
  if (slugs.length > 0) {
    slugs.forEach((s) => keysToDelete.push(s.toLowerCase().replace(/^\//, "")));
  }

  if (tag) {
    const keys = await redis.keys("link:*");
    const pipeline = redis.multi();
    for (const key of keys) {
      const s = key.replace("link:", "");
      pipeline.hGetAll(`meta:${s}`);
    }
    const metas = await pipeline.exec();

    if (metas) {
      keys.forEach((key, index) => {
        const meta = metas[index] as unknown as Record<string, string>;
        const tags = meta.tags ? meta.tags.split(",").map((t) => t.trim()) : [];
        if (tags.includes(tag!)) {
          keysToDelete.push(key.replace("link:", ""));
        }
      });
    }
  }

  const uniqueKeys = Array.from(new Set(keysToDelete));

  if (uniqueKeys.length === 0) {
    return NextResponse.json({
      deleted: [],
      notFound: [],
      message: "No matching links found",
    });
  }

  const deleted: string[] = [];
  const notFound: string[] = [];
  const multi = redis.multi();

  for (const key of uniqueKeys) {
    multi.exists(`link:${key}`);
  }
  const existsResults = await multi.exec();

  const deleteMulti = redis.multi();

  if (existsResults) {
    uniqueKeys.forEach((key, index) => {
      if (existsResults[index]) {
        deleteMulti.del(`link:${key}`);
        deleteMulti.del(`count:${key}`);
        deleteMulti.del(`meta:${key}`);
        deleted.push(key);
      } else {
        notFound.push(key);
      }
    });
  }

  if (deleted.length > 0) {
    await deleteMulti.exec();
  }

  return NextResponse.json({
    deleted,
    notFound,
    summary: {
      deleted: deleted.length,
      notFound: notFound.length,
      total: uniqueKeys.length,
    },
  });
}
