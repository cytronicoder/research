import { getRedisClient } from "@/lib/redis";
import SearchableProjects from "@/components/SearchableProjects";
import { getOrcidWorks } from "@/lib/orcid";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface LinkItem {
  slug: string;
  target: string;
  shortUrl: string;
  title: string | null;
  description: string | null;
  tags: string[];
  source: "manual" | "orcid";
  clicks: number;
  createdAt?: string | null;
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
          clicks: Number((await redis.get(`count:${slug}`)) || 0),
          createdAt: meta.createdAt || null,
        };
      })
    );

    const manualLinks = links.filter(link => link.source === "manual");

    return manualLinks;
  } catch (error) {
    console.error("Error fetching links:", error);
    return [];
  }
}

interface CollectionItem {
  id: string;
  name: string;
  description: string;
  projects: string[];
  tags?: string[];
  createdAt: string | null;
}

async function getCollections(): Promise<CollectionItem[]> {
  if (!process.env.RESEARCH_REDIS_URL && !process.env.REDIS_URL) {
    return [];
  }

  try {
    const redis = await getRedisClient();
    const keys = await redis.keys("collection:*");

    const collections = await Promise.all(
      keys.map(async (key) => {
        const id = key.replace("collection:", "");
        const data = await redis.hGetAll(key);
        return {
          id,
          name: data.name || "",
          description: data.description || "",
          projects: data.projects ? data.projects.split(",").filter(Boolean) : [],
          tags: data.tags ? data.tags.split(",").filter(Boolean) : [],
          createdAt: data.createdAt || null,
        };
      })
    );

    return collections;
  } catch (error) {
    console.error("Error fetching collections:", error);
    return [];
  }
}

export default async function Home() {
  const manualLinks = await getLinks();
  const collections = await getCollections();
  const orcidWorks = await getOrcidWorks(process.env.ORCID_ID || "");
  const allLinks = [...manualLinks, ...orcidWorks];

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background-color)' }}>
      <div className="max-w-4xl w-full mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <SearchableProjects initialLinks={allLinks} initialCollections={collections} />
      </div>
    </div>
  );
}
