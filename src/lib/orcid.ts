interface OrcidWork {
  "put-code": number;
  title: {
    title: {
      value: string;
    };
  };
  "journal-title"?: {
    value: string;
  };
  "short-description"?: string;
  "publication-date": {
    year: {
      value: string;
    };
    month?: {
      value: string;
    };
    day?: {
      value: string;
    };
  };
  url?: {
    value: string;
  };
  "external-ids"?: {
    "external-id": {
      "external-id-type": string;
      "external-id-value": string;
      "external-id-url": {
        value: string;
      };
    }[];
  };
}

interface OrcidWorkGroup {
  "work-summary": OrcidWork[];
}

interface LinkItem {
  slug: string;
  target: string;
  shortUrl: string;
  title: string | null;
  description: string | null;
  tags: string[];
  source: "manual" | "orcid";
}

import { getRedisClient } from "./redis";

export async function getOrcidWorks(orcidId: string): Promise<LinkItem[]> {
  if (!orcidId) {
    return [];
  }

  try {
    const response = await fetch(
      `https://pub.orcid.org/v3.0/${orcidId}/works`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error("Error fetching ORCID works:", response.statusText);
      return [];
    }

    const data = await response.json();
    const redis = await getRedisClient();

    const works = await Promise.all(
      data.group.map(async (workGroup: OrcidWorkGroup) => {
        const work = workGroup["work-summary"][0] as OrcidWork;
        const slug = `orcid-${work["put-code"]}`;

        // Check if we have custom metadata stored in Redis
        const storedMeta = await redis.hGetAll(`meta:${slug}`);
        const hasStoredMeta = Object.keys(storedMeta).length > 0;

        if (hasStoredMeta) {
          // Use stored metadata
          return {
            slug,
            target: (await redis.get(`link:${slug}`)) || "",
            shortUrl: `/${slug}`,
            title: storedMeta.title || work.title.title.value,
            description:
              storedMeta.description ||
              work["short-description"] ||
              work["journal-title"]?.value ||
              null,
            tags: storedMeta.tags
              ? storedMeta.tags.split(",")
              : work["journal-title"]
              ? [work["journal-title"].value]
              : [],
            source: "orcid" as const,
          };
        } else {
          // Store ORCID data in Redis for future customization
          const externalIds = work["external-ids"]?.["external-id"] || [];
          const doi = externalIds.find(
            (id) => id["external-id-type"] === "doi"
          );
          const target = doi
            ? doi["external-id-url"].value
            : work.url?.value || `https://orcid.org/${orcidId}`;

          await redis.set(`link:${slug}`, target);

          const metadata: Record<string, string> = {
            permanent: "0",
            createdAt: new Date().toISOString(),
            title: work.title.title.value,
          };

          const description =
            work["short-description"] || work["journal-title"]?.value;
          if (description) metadata.description = description;

          const tags = work["journal-title"]
            ? [work["journal-title"].value]
            : [];
          if (tags.length > 0) metadata.tags = tags.join(",");

          await redis.hSet(`meta:${slug}`, metadata);

          return {
            slug,
            target,
            shortUrl: `/${slug}`,
            title: work.title.title.value,
            description: description || null,
            tags,
            source: "orcid" as const,
          };
        }
      })
    );

    return works;
  } catch (error) {
    console.error("Error fetching ORCID works:", error);
    return [];
  }
}
