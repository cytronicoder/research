import { getRedisClient } from "@/lib/redis";
import SearchableProjects from "@/components/SearchableProjects";
import { getOrcidWorks } from "@/lib/orcid";
import { getOpenReviewSubmissions } from "@/lib/openreview";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface LinkItem {
  slug: string;
  target: string;
  shortUrl: string;
  title: string | null;
  description: string | null;
  tags: string[];
  source: "manual" | "orcid" | "openreview";
}

async function getLinks(): Promise<LinkItem[]> {
  if (!process.env.RESEARCH_REDIS_URL && !process.env.REDIS_URL) {
    console.log("Redis URL not configured, returning empty links");
    return [];
  }

  try {
    const redis = await getRedisClient();
    const keys = await redis.keys("link:*");

    const links = await Promise.all(
      keys.map(async (key) => {
        const slug = key.replace("link:", "");
        const target = await redis.get(key);
        const meta = await redis.hGetAll(`meta:${slug}`);

        return {
          slug,
          target: target || "",
          shortUrl: `/${slug}`,
          title: meta.title || null,
          description: meta.description || null,
          tags: meta.tags ? meta.tags.split(",") : [],
          source: slug.startsWith("orcid-") ? ("orcid" as const) : ("manual" as const),
        };
      })
    );

    // Filter out ORCID entries since they're handled by getOrcidWorks()
    const manualLinks = links.filter(link => link.source === "manual");

    return manualLinks;
  } catch (error) {
    console.error("Error fetching links:", error);
    return [];
  }
}

export default async function Home() {
  const manualLinks = await getLinks();
  const orcidWorks = await getOrcidWorks(process.env.ORCID_ID || "");
  const openReviewSubmissions = await getOpenReviewSubmissions(process.env.OPENREVIEW_USER_ID || "");
  const allLinks = [...manualLinks, ...orcidWorks, ...openReviewSubmissions];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
      <div className="max-w-4xl w-full mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <SearchableProjects initialLinks={allLinks} />
      </div>
    </div>
  );
}
