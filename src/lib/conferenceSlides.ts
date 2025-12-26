import fs from "fs";
import path from "path";
import yaml from "js-yaml";

export type Slide = {
  src: string;
  alt?: string;
  caption?: string;
  date?: string;
};

export type PhotoSet = {
  id: string;
  title?: string;
  description?: string;
  date?: string; // ISO date
  tags?: string[];
  slides: Slide[];
};

// Load and parse the YAML photoSets at module load (server-side code)
const photoSetsFile = path.join(process.cwd(), "src", "data", "photoSets.yml");
let rawPhotoSets: Record<string, any> = {};
try {
  const raw = fs.readFileSync(photoSetsFile, "utf8");
  rawPhotoSets = yaml.load(raw) as Record<string, any>;
} catch (e) {
  // If file missing or parse error, keep empty mapping
  console.error("Failed to load photoSets.yml:", e);
  rawPhotoSets = {};
}

// Normalize and build a mapping keyed by lowercase key
const photoSets: Record<string, PhotoSet> = Object.keys(rawPhotoSets).reduce((acc, k) => {
  const item = rawPhotoSets[k] as PhotoSet;
  const key = k.toLowerCase();
  // sort slides inside a set: by date (oldest first) when present, otherwise by src name
  const slides = ((item.slides || []) as Slide[]).slice().sort((a, b) => {
    const da = a.date ? Date.parse(a.date) : NaN;
    const db = b.date ? Date.parse(b.date) : NaN;

    if (!isNaN(da) && !isNaN(db) && da !== db) return da - db;
    if (!isNaN(da) && isNaN(db)) return -1;
    if (isNaN(da) && !isNaN(db)) return 1;

    // fallback: alphabetical by src
    return (a.src || "").localeCompare(b.src || "");
  });

  acc[key] = {
    id: item.id || key,
    title: item.title,
    description: item.description,
    date: item.date,
    tags: item.tags,
    slides,
  };
  return acc;
}, {} as Record<string, PhotoSet>);

// Slides lookup
const projectSlides: Record<string, Slide[]> = Object.keys(photoSets).reduce((acc, k) => {
  acc[k.toLowerCase()] = photoSets[k].slides;
  return acc;
}, {} as Record<string, Slide[]>);

/**
 * Lookup slides for a given key (project slug or collection id). Key match is case-insensitive.
 */
export function getSlidesFor(key?: string): Slide[] | undefined {
  if (!key) return undefined;
  return projectSlides[key.toLowerCase()];
}

/**
 * Return the full PhotoSet metadata for a given key (if available)
 */
export function getPhotoSet(key?: string): PhotoSet | undefined {
  if (!key) return undefined;
  return photoSets[key.toLowerCase()];
}

/**
 * Return all photo sets sorted by date (oldest first). If date is missing or equal, sort by id.
 * If dates equal and both have slides, use first slide src name to break ties.
 */
export function getAllPhotoSets(): PhotoSet[] {
  return Object.values(photoSets).sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    if (dateA !== dateB) return dateA - dateB; // old to new

    // fallback: compare id
    const idCmp = (a.id || "").localeCompare(b.id || "");
    if (idCmp !== 0) return idCmp;

    // final tie-breaker: compare first slide src
    const srcA = a.slides?.[0]?.src || "";
    const srcB = b.slides?.[0]?.src || "";
    return srcA.localeCompare(srcB);
  });
}