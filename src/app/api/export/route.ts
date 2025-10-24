import { NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  if (req.headers.get("x-admin-key") !== process.env.ADMIN_KEY)
    return unauthorized();

  const redis = await getRedisClient();
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "json";
  const source = searchParams.get("source");

  const keys = await redis.keys("link:*");
  const exportData = [];

  for (const key of keys) {
    const slug = key.replace("link:", "");
    const target = await redis.get(key);
    const clicks = Number((await redis.get(`count:${slug}`)) || 0);
    const meta = await redis.hGetAll(`meta:${slug}`);

    if (!target) continue;

    let entrySource: "manual" | "orcid" = "manual";
    if (slug.startsWith("orcid-")) entrySource = "orcid";

    if (source && entrySource !== source) continue;

    const entry = {
      slug,
      target,
      title: meta.title || "",
      description: meta.description || "",
      tags: meta.tags || "",
      source: entrySource,
      clicks,
      permanent: meta.permanent === "1",
      createdAt: meta.createdAt || "",
    };

    exportData.push(entry);
  }

  exportData.sort(
    (a, b) =>
      new Date(b.createdAt || 0).getTime() -
      new Date(a.createdAt || 0).getTime()
  );

  if (format === "csv") {
    const headers = [
      "slug",
      "target",
      "title",
      "description",
      "tags",
      "source",
      "clicks",
      "permanent",
      "createdAt",
    ];
    const csvContent = [
      headers.join(","),
      ...exportData.map((row) =>
        headers
          .map((header) => {
            const value = row[header as keyof typeof row] || "";
            const stringValue = String(value);
            if (stringValue.includes(",") || stringValue.includes('"')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          })
          .join(",")
      ),
    ].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="research-export-${
          new Date().toISOString().split("T")[0]
        }.csv"`,
      },
    });
  } else {
    return NextResponse.json({
      export: exportData,
      metadata: {
        total: exportData.length,
        generatedAt: new Date().toISOString(),
        format: "json",
        source: source || "all",
      },
    });
  }
}
