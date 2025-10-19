interface OpenReviewNote {
  id: string;
  invitation: string | null;
  invitations?: string[];
  readers: string[];
  writers: string[];
  signatures: string[];
  content: {
    title: { value: string } | string;
    abstract?: { value: string } | string;
    authors: { value: string[] } | string[];
    venue?: { value: string } | string;
    venueid?: { value: string } | string;
    _bibtex?: { value: string } | string;
    pdf?: { value: string } | string;
    [key: string]: any;
  };
  tcdate: number;
  tmdate: number;
  cdate: number;
  ddate?: number;
  forum?: string;
  replyto?: string;
  number?: number;
  details?: {
    invitation?: any;
    invitations?: any[];
    replyCount?: number;
  };
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

function extractValue(field: string | { value: string } | undefined): string {
  if (typeof field === "string") return field;
  if (field && typeof field === "object" && "value" in field)
    return field.value;
  return "";
}

function extractArrayValue(
  field: string[] | { value: string[] } | undefined
): string[] {
  if (Array.isArray(field)) return field;
  if (
    field &&
    typeof field === "object" &&
    "value" in field &&
    Array.isArray(field.value)
  )
    return field.value;
  return [];
}

async function getAuthToken(
  username: string,
  password: string
): Promise<string | null> {
  console.log(`Debug: Attempting OpenReview login for user: ${username}`);

  try {
    const response = await fetch("https://api2.openreview.net/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: username, password }),
    });

    console.log(`Debug: OpenReview login response status: ${response.status}`);

    if (!response.ok) {
      console.error(
        "Error authenticating with OpenReview:",
        response.statusText
      );
      return null;
    }

    const data = await response.json();
    console.log(
      `Debug: OpenReview login successful, token received: ${
        data.token ? "yes" : "no"
      }`
    );
    return data.token;
  } catch (error) {
    console.error("Error getting OpenReview auth token:", error);
    return null;
  }
}

export async function getOpenReviewSubmissions(
  userId: string
): Promise<LinkItem[]> {
  console.log(`Debug: Fetching OpenReview submissions for user ID: ${userId}`);

  if (!userId) {
    console.log("Debug: No OpenReview user ID provided, returning empty array");
    return [];
  }

  try {
    const username = process.env.OPENREVIEW_USERNAME;
    const password = process.env.OPENREVIEW_PASSWORD;

    console.log(
      `Debug: OpenReview credentials - Username: ${
        username ? "set" : "not set"
      }, Password: ${password ? "set" : "not set"}`
    );

    let authToken: string | null = null;

    if (username && password) {
      console.log("Debug: Attempting OpenReview authentication...");
      authToken = await getAuthToken(username, password);
      if (!authToken) {
        console.warn(
          "Failed to authenticate with OpenReview, will attempt unauthenticated access"
        );
      } else {
        console.log("Debug: OpenReview authentication successful");
      }
    } else {
      console.log(
        "Debug: No OpenReview credentials provided, attempting unauthenticated access"
      );
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
    console.log(
      `Debug: OpenReview profile API response - Profiles found: ${
        profileData.profiles?.length || 0
      }`
    );

    if (!profileData.profiles || profileData.profiles.length === 0) {
      console.error("No OpenReview profile found for user:", userId);
      return [];
    }

    const profileId = profileData.profiles[0].id;
    console.log(`Debug: Using profile ID: ${profileId}`);

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
    console.log(
      `Debug: OpenReview notes API response - Total notes: ${
        notesData.notes?.length || 0
      }`
    );

    notesData.notes.forEach((note: OpenReviewNote, index: number) => {
      const title = extractValue(note.content?.title);
      console.log(
        `Debug: Note ${index + 1} - Invitation: "${
          note.invitation
        }", Invitations array: ${JSON.stringify(
          note.invitations
        )}, Title: "${title.substring(0, 50)}..."`
      );
    });

    const submissionNotes = notesData.notes.filter((note: OpenReviewNote) => {
      const hasSubmissionInvitation =
        note.invitations &&
        note.invitations.some(
          (inv: string) =>
            inv.includes("/-/Submission") ||
            inv.includes("/-/Blind_Submission") ||
            inv.includes("/-/Paper") ||
            inv.includes("/-/Proceedings")
        );

      const hasSubmissionContent =
        note.content &&
        note.content.title &&
        note.content.abstract &&
        (note.content.pdf || note.content.venue);

      const isSubmission = hasSubmissionInvitation || hasSubmissionContent;

      console.log(
        `Debug: Note filtering - Has submission invitation: ${hasSubmissionInvitation}, Has submission content: ${hasSubmissionContent}, Is submission: ${isSubmission}, Title: "${extractValue(
          note.content?.title
        ).substring(0, 30)}..."`
      );

      return isSubmission && !note.ddate;
    });

    console.log(
      `Debug: Filtered to ${submissionNotes.length} submission notes`
    );

    const redis = await getRedisClient();

    const submissions = await Promise.all(
      submissionNotes.map(async (note: OpenReviewNote) => {
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
            title: extractValue(note.content.title),
          };

          const abstract = extractValue(note.content.abstract);
          if (abstract) {
            metadata.description = abstract;
          }

          const venue = extractValue(note.content.venue);
          const tags = [venue || "OpenReview"].filter(Boolean);
          if (tags.length > 0) {
            metadata.tags = tags.join(",");
          }

          await redis.hSet(`meta:${slug}`, metadata);

          return {
            slug,
            target,
            shortUrl: `/${slug}`,
            title: extractValue(note.content.title),
            description: extractValue(note.content.abstract) || null,
            tags,
            source: "openreview" as const,
            clicks: 0,
            createdAt: new Date().toISOString(),
          };
        }
      })
    );

    console.log(
      `Debug: OpenReview processing complete - ${submissions.length} submissions returned`
    );
    return submissions;
  } catch (error) {
    console.error("Error fetching OpenReview submissions:", error);
    return [];
  }
}
