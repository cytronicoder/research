interface OpenReviewNote {
  id: string;
  invitation: string;
  readers: string[];
  writers: string[];
  signatures: string[];
  content: {
    title: string;
    abstract?: string;
    authors: string[];
    venue?: string;
    venueid?: string;
    _bibtex?: string;
    pdf?: string;
    [key: string]: string | string[] | undefined;
  };
  tcdate: number;
  tmdate: number;
  cdate: number;
  ddate?: number;
  forum?: string;
  replyto?: string;
  number?: number;
}

interface LinkItem {
  slug: string;
  target: string;
  shortUrl: string;
  title: string | null;
  description: string | null;
  tags: string[];
  source: "manual" | "orcid" | "openreview";
  clicks: number;
  createdAt?: string | null;
}

import { getRedisClient } from "./redis";

async function getAuthToken(
  username: string,
  password: string
): Promise<string | null> {
  try {
    const response = await fetch("https://api2.openreview.net/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: username, password }),
    });

    if (!response.ok) {
      console.error(
        "Error authenticating with OpenReview:",
        response.statusText
      );
      return null;
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error("Error getting OpenReview auth token:", error);
    return null;
  }
}

export async function getOpenReviewSubmissions(
  userId: string
): Promise<LinkItem[]> {
  if (!userId) {
    return [];
  }

  try {
    const username = process.env.OPENREVIEW_USERNAME;
    const password = process.env.OPENREVIEW_PASSWORD;

    let authToken: string | null = null;

    if (username && password) {
      authToken = await getAuthToken(username, password);
      if (!authToken) {
        console.warn(
          "Failed to authenticate with OpenReview, will attempt unauthenticated access"
        );
      }
    }

    const headers: Record<string, string> = {
      "User-Agent": "research-site/1.0",
    };

    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    const profileResponse = await fetch(
      `https://api2.openreview.net/profiles?id=${encodeURIComponent(userId)}`,
      { headers }
    );

    if (!profileResponse.ok) {
      console.error(
        "Error fetching OpenReview profile:",
        profileResponse.statusText
      );
      return [];
    }

    const profileData = await profileResponse.json();
    if (!profileData.profiles || profileData.profiles.length === 0) {
      console.error("No OpenReview profile found for user:", userId);
      return [];
    }

    const profileId = profileData.profiles[0].id;
    const notesResponse = await fetch(
      `https://api2.openreview.net/notes?content.authorids=${encodeURIComponent(
        profileId
      )}&details=replyCount,invitation&sort=cdate:desc`,
      { headers }
    );

    if (!notesResponse.ok) {
      console.error(
        "Error fetching OpenReview notes:",
        notesResponse.statusText
      );
      return [];
    }

    const notesData = await notesResponse.json();
    const redis = await getRedisClient();

    const submissions = await Promise.all(
      notesData.notes
        .filter((note: OpenReviewNote) => {
          return note.invitation && (
            note.invitation.includes("/-/Submission") ||
            note.invitation.includes("/-/Blind_Submission") ||
            note.invitation.includes("/-/Paper")
          );
        })
        .map(async (note: OpenReviewNote) => {
          const slug = `openreview-${note.id}`;
          const storedMeta = await redis.hGetAll(`meta:${slug}`);
          const hasStoredMeta = Object.keys(storedMeta).length > 0;

          if (hasStoredMeta) {
            return {
              slug,
              target:
                (await redis.get(`link:${slug}`)) ||
                `https://openreview.net/forum?id=${note.id}`,
              shortUrl: `/${slug}`,
              title: storedMeta.title || note.content.title,
              description:
                storedMeta.description || note.content.abstract || null,
              tags: storedMeta.tags
                ? storedMeta.tags.split(",")
                : [note.content.venue || "OpenReview"].filter(Boolean),
              source: "openreview" as const,
              clicks: Number((await redis.get(`count:${slug}`)) || 0),
              createdAt: storedMeta.createdAt || null,
            };
          } else {
            const target = note.content.pdf
              ? `https://openreview.net/pdf?id=${note.id}`
              : `https://openreview.net/forum?id=${note.id}`;

            await redis.set(`link:${slug}`, target);

            const metadata: Record<string, string> = {
              permanent: "0",
              createdAt: new Date().toISOString(),
              title: note.content.title,
            };

            if (note.content.abstract) {
              metadata.description = note.content.abstract;
            }

            const tags = [note.content.venue || "OpenReview"].filter(Boolean);
            if (tags.length > 0) {
              metadata.tags = tags.join(",");
            }

            await redis.hSet(`meta:${slug}`, metadata);

            return {
              slug,
              target,
              shortUrl: `/${slug}`,
              title: note.content.title,
              description: note.content.abstract || null,
              tags,
              source: "openreview" as const,
              clicks: 0,
              createdAt: new Date().toISOString(),
            };
          }
        })
    );

    return submissions;
  } catch (error) {
    console.error("Error fetching OpenReview submissions:", error);
    return [];
  }
}
