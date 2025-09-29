import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const runtime = "edge";

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

  const key = slug.toLowerCase().replace(/^\//, "");
  await kv.set(`link:${key}`, target);
  await kv.hset(`meta:${key}`, { permanent: !!permanent });

  const origin = new URL(req.url).origin;
  return NextResponse.json({ slug: key, short: `${origin}/${key}`, target });
}

export async function GET(req: NextRequest) {
  // read link + stats (also protected)
  if (req.headers.get("x-admin-key") !== process.env.ADMIN_KEY)
    return unauthorized();
  const { searchParams } = new URL(req.url);
  const slug = (searchParams.get("slug") || "").toLowerCase();
  const target = slug ? await kv.get<string>(`link:${slug}`) : null;
  const clicks = slug
    ? Number((await kv.get<number>(`count:${slug}`)) || 0)
    : null;
  return NextResponse.json({ slug, target, clicks });
}

export async function DELETE(req: NextRequest) {
  if (req.headers.get("x-admin-key") !== process.env.ADMIN_KEY)
    return unauthorized();
  const { searchParams } = new URL(req.url);
  const slug = (searchParams.get("slug") || "").toLowerCase();
  await kv.del(`link:${slug}`);
  await kv.del(`count:${slug}`);
  return NextResponse.json({ deleted: slug });
}
