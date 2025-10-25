import { NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  if (req.headers.get("x-admin-key") !== process.env.ADMIN_KEY)
    return unauthorized();

  try {
    const redis = await getRedisClient();
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json";
    const source = searchParams.get("source");

    const keys = await redis.keys("link:*");

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

    const exportData = [];

    for (let i = 0; i < keys.length; i++) {
      const slug = keys[i].replace("link:", "");
      const target = pipelineResults[i * 3] as unknown as string | null;
      const clicks = pipelineResults[i * 3 + 1] as unknown as string | null;
      const meta = pipelineResults[i * 3 + 2] as unknown as Record<
        string,
        string
      > | null;

      if (!target || !meta) continue;

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
        clicks: Number(clicks || 0),
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
  } catch (error) {
    console.error("Error exporting data:", error);
    return NextResponse.json(
      { error: "failed to export data" },
      { status: 500 }
    );
  }
}
