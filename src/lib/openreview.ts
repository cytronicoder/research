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
    keywords?: { value: string[] } | string[];
    _bibtex?: { value: string } | string;
    pdf?: { value: string } | string;
    [key: string]: unknown;
  };
  tcdate: number;
  tmdate: number;
  cdate: number;
  ddate?: number;
  forum?: string;
  replyto?: string;
  number?: number;
  details?: {
    invitation?: {
      id: string;
      type: string;
      maxReplies: number;
      signatures: string[];
      readers: string[];
      writers: string[];
      invitees: string[];
      edit: unknown;
      invitations: unknown[];
      domain: string;
      tcdate: number;
      cdate: number;
      tmdate: number;
      mdate: number;
      details: {
        writable: boolean;
      };
    };
    invitations?: {
      id: string;
      type: string;
      maxReplies: number;
      signatures: string[];
      readers: string[];
      writers: string[];
      invitees: string[];
      edit: unknown;
      invitations: unknown[];
      domain: string;
      tcdate: number;
      cdate: number;
      tmdate: number;
      mdate: number;
      details: {
        writable: boolean;
      };
    }[];
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

function cleanConferenceName(venue: string, invitations?: string[]): string {
  if (invitations && invitations.length > 0) {
    for (const invitation of invitations) {
      const match = invitation.match(/^([A-Z][a-z]+\.org)\/([A-Z]+)\/(\d{4})/);
      if (match) {
        const [, org, conf, year] = match;
        const cleanOrg = org.replace(".org", "");
        return `${cleanOrg} ${conf} ${year}`;
      }

      const ieeeMatch = invitation.match(
        /^([A-Z][a-z]+\.org)\/([A-Z]+)\/([A-Z]+)\/(\d{4})/
      );
      if (ieeeMatch) {
        const [, org, , conf, year] = ieeeMatch;
        const cleanOrg = org.replace(".org", "");
        return `${cleanOrg} ${conf}'${year.slice(-2)}`;
      }
    }
  }

  if (!venue) return "OpenReview";
  let cleanName = venue
    .replace(/\s+Poster.*$/i, "")
    .replace(/\s+Abstract.*$/i, "")
    .replace(/\s+Submission.*$/i, "")
    .replace(/\s+Paper.*$/i, "")
    .replace(/\s+Proceedings.*$/i, "")
    .replace(/\s+Workshop.*$/i, "")
    .trim();

  if (cleanName.length < 5) {
    const match = venue.match(/^([A-Z\s]+(?:\s+[A-Z]+)*)\s+(\d{4})/);
    if (match) {
      cleanName = `${match[1]} ${match[2]}`;
    }
  }

  return cleanName || "OpenReview";
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

        const isProceedings =
          note.invitations?.some((inv: string) =>
            inv.includes("/-/Proceedings")
          ) || false;

        const storedMeta = await redis.hGetAll(`meta:${slug}`);
        const hasStoredMeta = Object.keys(storedMeta).length > 0;

        if (hasStoredMeta) {
          let tags = storedMeta.tags ? storedMeta.tags.split(",") : [];
          const venue = extractValue(note.content.venue);
          const cleanedConference = cleanConferenceName(
            venue,
            note.invitations
          );

          const keywords = extractArrayValue(note.content.keywords);

          if (
            tags.length === 1 &&
            (tags[0] === venue ||
              tags[0] === "OpenReview" ||
              tags[0].includes("Poster") ||
              tags[0].includes("Abstract"))
          ) {
            tags = [cleanedConference, ...keywords].filter(Boolean);
            if (tags.length === 0) tags = ["OpenReview"];
            await redis.hSet(`meta:${slug}`, { tags: tags.join(",") });
            console.log(
              `Debug: Updated stored tags for ${slug} from "${
                storedMeta.tags
              }" to "${tags.join(",")}"`
            );
          } else if (
            keywords.length > 0 &&
            !tags.some((tag: string) => keywords.includes(tag))
          ) {
            tags = [...tags, ...keywords];
            await redis.hSet(`meta:${slug}`, { tags: tags.join(",") });
            console.log(
              `Debug: Added keywords to tags for ${slug}: "${tags.join(",")}"`
            );
          }

          return {
            slug: isProceedings ? `${slug}-proceedings` : slug,
            target:
              (await redis.get(`link:${slug}`)) ||
              `https://openreview.net/forum?id=${note.id}`,
            shortUrl: `/${slug}`,
            title: storedMeta.title || note.content.title,
            description:
              storedMeta.description || note.content.abstract || null,
            tags,
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
          const conferenceTag = cleanConferenceName(venue, note.invitations);
          const keywords = extractArrayValue(note.content.keywords);
          const allTags = [conferenceTag, ...keywords].filter(Boolean);

          const tags = allTags.length > 0 ? allTags : ["OpenReview"];
          if (tags.length > 0) {
            metadata.tags = tags.join(",");
          }

          await redis.hSet(`meta:${slug}`, metadata);

          return {
            slug: isProceedings ? `${slug}-proceedings` : slug,
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

    const submissionsByTitle = new Map<string, LinkItem[]>();

    for (const submission of submissions) {
      const normalizedTitle =
        submission.title
          ?.toLowerCase()
          .replace(/[^\w\s]/g, "")
          .trim() || "";

      if (!submissionsByTitle.has(normalizedTitle)) {
        submissionsByTitle.set(normalizedTitle, []);
      }
      submissionsByTitle.get(normalizedTitle)!.push(submission);
    }

    const mergedSubmissions: LinkItem[] = [];

    for (const [, titleSubmissions] of submissionsByTitle) {
      if (titleSubmissions.length === 1) {
        mergedSubmissions.push(titleSubmissions[0]);
      } else {
        console.log(
          `Debug: Found ${titleSubmissions.length} versions of the same paper, keeping the latest (most recent submission)`
        );

        titleSubmissions.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });

        let primarySubmission = titleSubmissions[0];
        const acceptedSubmission = titleSubmissions.find((s) =>
          s.slug.includes("proceedings")
        );

        console.log(`Debug: All versions: ${titleSubmissions.map(s => s.slug).join(", ")}`);

        if (acceptedSubmission) {
          primarySubmission = acceptedSubmission;
          console.log(
            `Debug: Found accepted/proceedings version, using it as primary (slug: ${acceptedSubmission.slug})`
          );
        } else {
          console.log(`Debug: Using most recent submission as primary (slug: ${primarySubmission.slug})`);
        }

        const allTags = new Set<string>();
        for (const submission of titleSubmissions) {
          submission.tags.forEach((tag) => allTags.add(tag));
        }

        const bestDescription =
          titleSubmissions
            .map((s) => s.description)
            .filter((desc): desc is string => desc !== null && desc.length > 0)
            .sort((a, b) => b.length - a.length)[0] || null;

        const mergedSubmission: LinkItem = {
          ...primarySubmission,
          description: bestDescription,
          tags: Array.from(allTags),
        };

        mergedSubmissions.push(mergedSubmission);
      }
    }

    console.log(
      `Debug: After merging - ${mergedSubmissions.length} submissions returned`
    );
    return mergedSubmissions;
  } catch (error) {
    console.error("Error fetching OpenReview submissions:", error);
    return [];
  }
}
