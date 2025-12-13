import { getRedisClient } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

function escapeYamlString(str: string): string {
  if (!str) return '""';

  if (/[:#\[\]{},&*!|>'"%@`\n\r\t\\]/.test(str)) {
    return `"${str
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t")}"`;
  }

  return `"${str}"`;
}

export async function GET(req: NextRequest) {
  if (req.headers.get("x-admin-key") !== process.env.ADMIN_KEY)
    return unauthorized();

  try {
    const redis = await getRedisClient();
    const { searchParams } = new URL(req.url);
    const format = (searchParams.get("format") || "json").toLowerCase();
    const source = searchParams.get("source");
    const tag = searchParams.get("tag");
    const includeClicks = searchParams.get("includeClicks") !== "false";

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
      if (tag) {
        const tags = meta.tags ? meta.tags.split(",").map((t) => t.trim()) : [];
        const hasMatchingTag = tags.some((entryTag) =>
          entryTag.toLowerCase().includes(tag.toLowerCase())
        );
        if (!hasMatchingTag) continue;
      }

      const entry: any = {
        slug,
        target,
        title: meta.title || "",
        description: meta.description || "",
        tags: meta.tags || "",
        source: entrySource,
        permanent: meta.permanent === "1",
        startDate: meta.startDate || "",
        endDate: meta.endDate || "",
        githubRepo: meta.githubRepo || "",
        createdAt: meta.createdAt || "",
        updatedAt: meta.updatedAt || "",
      };

      if (includeClicks) {
        entry.clicks = Number(clicks || 0);
      }

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
        "permanent",
        "startDate",
        "endDate",
        "githubRepo",
        "createdAt",
        "updatedAt",
      ];

      if (includeClicks) {
        headers.splice(6, 0, "clicks");
      }

      const csvContent = [
        headers.join(","),
        ...exportData.map((row) =>
          headers
            .map((header) => {
              const value = row[header as keyof typeof row] || "";
              const stringValue = String(value);
              if (
                stringValue.includes(",") ||
                stringValue.includes('"') ||
                stringValue.includes("\n")
              ) {
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
    } else if (format === "yaml" || format === "yml") {
      const yamlContent = exportData
        .map((entry) => {
          const yamlEntry = [
            `slug: ${escapeYamlString(entry.slug)}`,
            `target: ${escapeYamlString(entry.target)}`,
            `title: ${escapeYamlString(entry.title)}`,
            `description: ${escapeYamlString(entry.description)}`,
            `tags: ${escapeYamlString(entry.tags)}`,
            `source: ${entry.source}`,
            `permanent: ${entry.permanent}`,
            `startDate: ${escapeYamlString(entry.startDate)}`,
            `endDate: ${escapeYamlString(entry.endDate)}`,
            `githubRepo: ${escapeYamlString(entry.githubRepo)}`,
            `createdAt: ${escapeYamlString(entry.createdAt)}`,
            `updatedAt: ${escapeYamlString(entry.updatedAt)}`,
          ];

          if (includeClicks) {
            yamlEntry.splice(6, 0, `clicks: ${entry.clicks}`);
          }

          return yamlEntry.join("\n");
        })
        .join("\n\n---\n\n");

      return new NextResponse(yamlContent, {
        headers: {
          "Content-Type": "application/yaml",
          "Content-Disposition": `attachment; filename="research-export-${
            new Date().toISOString().split("T")[0]
          }.yaml"`,
        },
      });
    } else {
      return NextResponse.json({
        export: exportData,
        metadata: {
          total: exportData.length,
          generatedAt: new Date().toISOString(),
          format: "json",
          filters: {
            source: source || "all",
            tag: tag || null,
            includeClicks,
          },
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
