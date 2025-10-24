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
}

export async function PUT(req: NextRequest) {
  if (req.headers.get("x-admin-key") !== process.env.ADMIN_KEY)
    return unauthorized();

  const { slug, target, permanent, title, description, tags } =
    await req.json();
  if (!slug)
    return NextResponse.json({ error: "slug required" }, { status: 400 });

  const redis = await getRedisClient();
  const key = slug.toLowerCase().replace(/^\//, "");

  if (!isValidSlug(key))
    return NextResponse.json(
      {
        error:
          "invalid slug format (use only letters, numbers, hyphens, underscores)",
      },
      { status: 400 }
    );

  if (target && !/^https?:\/\//i.test(target))
    return NextResponse.json(
      { error: "target must start with http(s)://" },
      { status: 400 }
    );

  try {
    const exists = await redis.exists(`link:${key}`);
    if (!exists) {
      return NextResponse.json({ error: "link not found" }, { status: 404 });
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

    const storedMetadata = { ...existingMeta, ...metadata };

    multi.hSet(`meta:${key}`, storedMetadata);
    await multi.exec();

    const finalTarget = target || (await redis.get(`link:${key}`));
    const origin = new URL(req.url).origin;

    return NextResponse.json({
      slug: key,
      short: `${origin}/${key}`,
      target: finalTarget,
      ...parseMetadata(storedMetadata),
    });
  } catch (error) {
    console.error(`Error updating link ${key}:`, error);
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
  const limitParam = parseInt(searchParams.get("limit") || "", 10);
  const offsetParam = parseInt(searchParams.get("offset") || "", 10);
  const limit = Number.isNaN(limitParam)
    ? 100
    : Math.min(Math.max(limitParam, 1), 200);
  const offset = Number.isNaN(offsetParam) || offsetParam < 0 ? 0 : offsetParam;

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

  const { slugs, updates } = await req.json();
  if (!slugs || !Array.isArray(slugs) || !updates)
    return NextResponse.json(
      { error: "slugs array and updates object required" },
      { status: 400 }
    );

  const redis = await getRedisClient();
  const results = [];

  for (const slug of slugs) {
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
}

export async function DELETE(req: NextRequest) {
  if (req.headers.get("x-admin-key") !== process.env.ADMIN_KEY)
    return unauthorized();

  const redis = await getRedisClient();
  const { searchParams } = new URL(req.url);
  const slugParam = searchParams.get("slug");
  let slugsParam = searchParams.get("slugs");
  let bodySlug: string | undefined;
  let bodySlugs: string[] | undefined;

  if (!slugParam && !slugsParam) {
    try {
      const body = await req.json();
      if (body) {
        if (typeof body.slug === "string") bodySlug = body.slug;
        if (Array.isArray(body.slugs)) {
          bodySlugs = body.slugs;
        } else if (typeof body.slugs === "string") {
          slugsParam = body.slugs;
        }
      }
    } catch (error) {
      if (!(error instanceof SyntaxError)) {
        console.error("Failed to parse DELETE body:", error);
        return NextResponse.json(
          { error: "invalid request body" },
          { status: 400 }
        );
      }
    }
  }

  const normalizeSlugValue = (value: string) =>
    value.toLowerCase().replace(/^\/+/, "").trim();

  const singleSlug = slugParam || bodySlug;
  const bulkSlugs = bodySlugs
    ? bodySlugs
    : slugsParam
    ? slugsParam.split(",").map((s) => s.trim())
    : undefined;

  if (!singleSlug && (!bulkSlugs || bulkSlugs.length === 0)) {
    return NextResponse.json(
      { error: "slug or slugs parameter required" },
      { status: 400 }
    );
  }

  const deleteForKey = async (key: string) => {
    const [linkDeleted, countDeleted, metaDeleted] = await Promise.all([
      redis.del(`link:${key}`),
      redis.del(`count:${key}`),
      redis.del(`meta:${key}`),
    ]);

    return {
      link: linkDeleted,
      count: countDeleted,
      meta: metaDeleted,
    };
  };

  try {
    if (singleSlug) {
      const normalized = normalizeSlugValue(singleSlug);

      if (!normalized || !isValidSlug(normalized)) {
        return NextResponse.json(
          { error: "invalid slug format" },
          { status: 400 }
        );
      }

      const exists = await redis.exists(`link:${normalized}`);

      if (!exists) {
        return NextResponse.json(
          { error: "link not found", deleted: [] },
          { status: 404 }
        );
      }

      console.log(`Deleting link:${normalized}`);

      const keysDeleted = await deleteForKey(normalized);

      return NextResponse.json({
        deleted: [normalized],
        keysDeleted,
      });
    }

    if (bulkSlugs && bulkSlugs.length > 0) {
      const normalizedSlugs = Array.from(
        new Set(
          bulkSlugs
            .map((s) => normalizeSlugValue(s))
            .filter((s) => s && isValidSlug(s))
        )
      );

      if (normalizedSlugs.length === 0) {
        return NextResponse.json(
          { error: "no valid slugs provided" },
          { status: 400 }
        );
      }

      const existenceChecks = await Promise.all(
        normalizedSlugs.map(async (key) => {
          const exists = await redis.exists(`link:${key}`);
          return { key, exists: exists > 0 };
        })
      );

      const deleted: string[] = [];
      const notFound: string[] = [];

      const deletionResults = await Promise.all(
        existenceChecks
          .filter(({ exists }) => exists)
          .map(async ({ key }) => {
            const result = await deleteForKey(key);
            deleted.push(key);
            return { key, result };
          })
      );

      for (const check of existenceChecks) {
        if (!check.exists) {
          notFound.push(check.key);
        }
      }

      const summary = {
        deleted: deleted.length,
        notFound: notFound.length,
        total: normalizedSlugs.length,
      };

      return NextResponse.json({
        deleted,
        notFound: notFound.length > 0 ? notFound : undefined,
        summary,
        details: deletionResults,
      });
    }
  } catch (error) {
    console.error("Error deleting links:", error);
    return NextResponse.json(
      { error: "failed to delete links" },
      { status: 500 }
    );
  }

  return NextResponse.json({ error: "invalid request" }, { status: 400 });
}
