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
  startDate?: string | null;
  endDate?: string | null;
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
    startDate: meta.startDate || null,
    endDate: meta.endDate || null,
  };
}

function prepareMetadata(
  data: {
    permanent?: boolean;
    title?: string;
    description?: string;
    tags?: string[] | string;
    startDate?: string;
    endDate?: string;
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
  if (data.startDate !== undefined) {
    metadata.startDate = data.startDate || "";
  }
  if (data.endDate !== undefined) {
    metadata.endDate = data.endDate || "";
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

async function fetchTitleFromUrl(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/<title>([^<]*)<\/title>/i);
    return match ? match[1].trim() : null;
  } catch (error) {
    console.error(`Failed to fetch title for ${url}:`, error);
    return null;
  }
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
      let {
        slug,
        target,
        permanent,
        title,
        description,
        tags,
        startDate,
        endDate,
      } = link;
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

      if (!title) {
        const fetchedTitle = await fetchTitleFromUrl(target);
        if (fetchedTitle) {
          title = fetchedTitle;
        }
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
          { permanent, title, description, tags, startDate, endDate },
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
      const {
        slug,
        target,
        permanent,
        title,
        description,
        tags,
        startDate,
        endDate,
      } = linkData;

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
        { permanent, title, description, tags, startDate, endDate },
        true
      );

      if (existingMeta.createdAt) {
        metadata.createdAt = existingMeta.createdAt;
      }

      multi.hSet(`meta:${key}`, metadata);
      await multi.exec();

      const finalTarget = target || (await redis.get(`link:${key}`));
      const finalMetadata = { ...existingMeta, ...metadata };

      results.push({
        slug: key,
        short: `${origin}/${key}`,
        target: finalTarget,
        ...parseMetadata(finalMetadata),
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
      const s = key.replace("link:", "");
      pipeline.get(key);
      pipeline.get(`count:${s}`);
      pipeline.hGetAll(`meta:${s}`);
    }

    const pipelineResults = await pipeline.exec();
    if (!pipelineResults) {
      throw new Error("Pipeline execution failed");
    }

    const results: LinkData[] = [];
    for (let i = 0; i < keys.length; i++) {
      const s = keys[i].replace("link:", "");
      const target = pipelineResults[i * 3] as unknown as string | null;
      const clicks = pipelineResults[i * 3 + 1] as unknown as string | null;
      const meta = pipelineResults[i * 3 + 2] as unknown as Record<
        string,
        string
      > | null;

      if (!target || !meta) continue;

      const entry: LinkData = {
        slug: s,
        target,
        clicks: Number(clicks || 0),
        metadata: parseMetadata(meta),
      };

      if (tag && !entry.metadata.tags.includes(tag)) continue;
      if (source && !s.startsWith(`${source}-`)) continue;
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
        const matchesSlug = s.toLowerCase().includes(searchLower);
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
    const { slug, addTags, removeTags } = body;

    if (!slug) {
      return NextResponse.json({ error: "slug required" }, { status: 400 });
    }

    if (
      (!addTags || !Array.isArray(addTags)) &&
      (!removeTags || !Array.isArray(removeTags))
    ) {
      return NextResponse.json(
        { error: "addTags or removeTags array required" },
        { status: 400 }
      );
    }

    const key = slug.toLowerCase().replace(/^\//, "");

    if (!isValidSlug(key)) {
      return NextResponse.json(
        {
          error:
            "invalid slug format (use only letters, numbers, hyphens, underscores)",
        },
        { status: 400 }
      );
    }

    const redis = await getRedisClient();

    const [exists, existingMeta] = await Promise.all([
      redis.exists(`link:${key}`),
      redis.hGetAll(`meta:${key}`),
    ]);

    if (!exists || Object.keys(existingMeta).length === 0) {
      return NextResponse.json({ error: "link not found" }, { status: 404 });
    }

    let currentTags = existingMeta.tags
      ? existingMeta.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    if (addTags && Array.isArray(addTags)) {
      const tagsToAdd = addTags.filter((t) => t && typeof t === "string");
      currentTags = [...new Set([...currentTags, ...tagsToAdd])];
    }

    if (removeTags && Array.isArray(removeTags)) {
      const tagsToRemove = new Set(
        removeTags.filter((t) => t && typeof t === "string")
      );
      currentTags = currentTags.filter((t) => !tagsToRemove.has(t));
    }

    const updatedMeta = {
      ...existingMeta,
      tags: currentTags.join(","),
      updatedAt: new Date().toISOString(),
    };

    await redis.hSet(`meta:${key}`, updatedMeta);

    return NextResponse.json({
      slug: key,
      updated: true,
      tags: currentTags,
      metadata: parseMetadata(updatedMeta),
    });
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

  let slug: string | undefined = searchParams.get("slug") || undefined;
  let slugsParam: string | undefined = searchParams.get("slugs") || undefined;
  let tag: string | undefined = searchParams.get("tag") || undefined;

  let body: any = null;
  try {
    body = await req.json();
  } catch (error) {
    if (!(error instanceof SyntaxError)) {
      console.error("Failed to parse DELETE body:", error);
      return NextResponse.json(
        { error: "invalid request body" },
        { status: 400 }
      );
    }
  }

  if (body) {
    if (typeof body.slug === "string") {
      slug = body.slug;
    }

    if (body.slugs) {
      if (Array.isArray(body.slugs)) {
        const joined = body.slugs.join(",");
        slugsParam = slugsParam ? `${slugsParam},${joined}` : joined;
      } else if (typeof body.slugs === "string") {
        slugsParam = slugsParam ? `${slugsParam},${body.slugs}` : body.slugs;
      }
    }

    if (typeof body.tag === "string") {
      tag = body.tag;
    }
  }

  const slugsList: string[] = slugsParam
    ? slugsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  if (!slug && slugsList.length === 0 && !tag) {
    return NextResponse.json(
      { error: "slug, slugs, or tag parameter required" },
      { status: 400 }
    );
  }

  const normalizeSlugValue = (value: string) =>
    value.toLowerCase().replace(/^\/+/, "").trim();

  const keysToDelete: string[] = [];
  const invalidSlugs: string[] = [];

  if (slug) {
    const normalized = normalizeSlugValue(slug);
    if (!normalized || !isValidSlug(normalized)) {
      invalidSlugs.push(slug);
    } else {
      keysToDelete.push(normalized);
    }
  }

  for (const s of slugsList) {
    const normalized = normalizeSlugValue(s);
    if (!normalized || !isValidSlug(normalized)) {
      invalidSlugs.push(s);
    } else {
      keysToDelete.push(normalized);
    }
  }

  if (invalidSlugs.length > 0) {
    return NextResponse.json(
      { error: "invalid slug format", invalid: invalidSlugs },
      { status: 400 }
    );
  }

  if (tag) {
    const keys = await redis.keys("link:*");
    if (keys.length > 0) {
      const pipeline = redis.multi();
      for (const key of keys) {
        const s = key.replace("link:", "");
        pipeline.hGetAll(`meta:${s}`);
      }
      const metas = await pipeline.exec();

      if (metas) {
        keys.forEach((key, index) => {
          const meta = metas[index] as unknown as Record<string, string>;
          const tagsStr = meta?.tags || "";
          const tagsList = tagsStr
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
          if (tagsList.includes(tag!)) {
            keysToDelete.push(key.replace("link:", ""));
          }
        });
      }
    }
  }

  const uniqueKeys = Array.from(new Set(keysToDelete));

  if (uniqueKeys.length === 0) {
    return NextResponse.json({
      deleted: [],
      notFound: [],
      summary: {
        deleted: 0,
        notFound: 0,
        total: 0,
      },
    });
  }

  const deleted: string[] = [];
  const notFound: string[] = [];

  const existsMulti = redis.multi();
  for (const key of uniqueKeys) {
    existsMulti.exists(`link:${key}`);
  }
  const existsResults = await existsMulti.exec();

  if (existsResults) {
    const deleteMulti = redis.multi();

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

    if (deleted.length > 0) {
      await deleteMulti.exec();
    }
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
