import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const runtime = "edge";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug: slugParam } = await params;
  const slug = (slugParam || "").trim().toLowerCase();
  if (!slug) return new NextResponse("OK", { status: 200 });

  const target = await kv.get<string>(`link:${slug}`);
  if (!target)
    return new NextResponse("Not found", {
      status: 404,
      headers: { "X-Robots-Tag": "noindex" },
    });

  // count click (best-effort; don’t block redirect if it fails)
  try {
    await kv.incr(`count:${slug}`);
  } catch {}

  const res = NextResponse.redirect(target, 301);
  res.headers.set("X-Robots-Tag", "noindex");
  return res;
}
