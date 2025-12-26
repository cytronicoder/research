"use client";

import { useEffect, useState } from "react";
import type { PhotoSet } from "@/lib/conferenceSlides";
import CollectionCard from "./CollectionCard";
import ProjectFooter from "./ProjectFooter";
import ProjectList from "./ProjectList";
import SearchBar from "./SearchBar";
import TagDirectory from "./TagDirectory";

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
    startDate?: string | null;
    endDate?: string | null;
    githubRepo?: string | null;
    photoSet?: PhotoSet | null;
}

interface CollectionItem {
    id: string;
    name: string;
    description: string;
    projects: string[];
    tags?: string[];
    createdAt: string | null;
    startDate?: string | null;
    endDate?: string | null;
    photoSet?: PhotoSet | null;
}

interface SearchableProjectsProps {
    initialLinks: LinkItem[];
    initialCollections?: CollectionItem[];
}

function sortItems<T extends {
    title?: string | null;
    name?: string;
    slug?: string;
    createdAt?: string | null;
}>(items: T[], sortBy: "alphabetical-asc" | "alphabetical-desc" | "newest" | "oldest", nameKey: "title" | "name" = "title"): T[] {
    return [...items].sort((a, b) => {
        switch (sortBy) {
            case "alphabetical-asc": {
                const nameA = (a[nameKey] || a.slug || "") as string;
                const nameB = (b[nameKey] || b.slug || "") as string;
                return nameA.localeCompare(nameB);
            }
            case "alphabetical-desc": {
                const nameA = (a[nameKey] || a.slug || "") as string;
                const nameB = (b[nameKey] || b.slug || "") as string;
                return nameB.localeCompare(nameA);
            }
            case "newest": {
                if (a.createdAt && b.createdAt) {
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                }
                const nameB = (b[nameKey] || b.slug || "") as string;
                return nameB.localeCompare((a[nameKey] || a.slug || "") as string);
            }
            case "oldest": {
                if (a.createdAt && b.createdAt) {
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                }
                const nameA = (a[nameKey] || a.slug || "") as string;
                const nameB = (b[nameKey] || b.slug || "") as string;
                return nameA.localeCompare(nameB);
            }
            default:
                return 0;
        }
    });
}

export default function SearchableProjects({ initialLinks, initialCollections = [] }: SearchableProjectsProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [sourceFilter, setSourceFilter] = useState<"all" | "manual" | "orcid">("all");
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [filteredLinks, setFilteredLinks] = useState<LinkItem[]>(initialLinks);
    const [isSearching, setIsSearching] = useState(false);
    const [highlights, setHighlights] = useState<Record<string, string[]>>({});
    const [sortBy, setSortBy] = useState<"alphabetical-asc" | "alphabetical-desc" | "newest" | "oldest">("alphabetical-asc");

    // Extract year from date string (format: "2024" or "2024-01-15")
    function extractYear(dateString: string | null | undefined): number | null {
        if (!dateString) return null;
        const year = parseInt(dateString.substring(0, 4), 10);
        return !isNaN(year) ? year : null;
    }

    useEffect(() => {
        const performSearch = async () => {
            if (!searchQuery && sourceFilter === 'all' && !selectedTag) {
                setFilteredLinks(initialLinks);
                setHighlights({});
                return;
            }

            setIsSearching(true);
            try {
                let filtered = initialLinks;

                if (searchQuery) {
                    filtered = filtered.filter(
                        (link) =>
                            link.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            link.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (link.title && link.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            (link.description && link.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            (link.tags && link.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())))
                    );
                }

                if (sourceFilter !== 'all') {
                    filtered = filtered.filter(link => link.source === sourceFilter);
                }

                if (selectedTag) {
                    filtered = filtered.filter(link =>
                        link.tags && link.tags.some(tag => tag.toLowerCase() === selectedTag.toLowerCase())
                    );
                }

                setFilteredLinks(filtered);
                setHighlights({});
            } finally {
                setIsSearching(false);
            }
        };

        const debounceTimer = setTimeout(performSearch, 300);
        return () => clearTimeout(debounceTimer);
    }, [searchQuery, sourceFilter, selectedTag, initialLinks]);

    const sortedLinks = sortItems(filteredLinks || [], sortBy, "title");

    const collectionsToRender = initialCollections.map(collection => {
        const hasSearchFilter = searchQuery.length > 0;
        const hasTagFilter = selectedTag !== null;

        const matchesCollectionName = hasSearchFilter && (
            collection.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            collection.description.toLowerCase().includes(searchQuery.toLowerCase())
        );

        const matchesCollectionTag = hasTagFilter && collection.tags && collection.tags.some(t => t.toLowerCase() === selectedTag.toLowerCase());

        let collectionProjects: LinkItem[] = [];

        if (matchesCollectionName || matchesCollectionTag) {
            collectionProjects = initialLinks.filter(link =>
                collection.projects.includes(link.slug) &&
                (sourceFilter === 'all' || link.source === sourceFilter) &&
                (!selectedTag || link.tags?.some(t => t.toLowerCase() === selectedTag.toLowerCase()))
            );
        } else {
            collectionProjects = sortedLinks.filter(link => collection.projects.includes(link.slug));
        }

        collectionProjects = sortItems(collectionProjects, sortBy, "title");

        let collectionStartDate = collection.startDate;
        let collectionEndDate = collection.endDate;

        if (collectionProjects.length > 0) {
            const years = collectionProjects
                .map(p => [extractYear(p.startDate), extractYear(p.endDate)])
                .filter(([s, e]) => s || e)
                .flat()
                .filter((y): y is number => y !== null);

            if (years.length > 0) {
                const minCollectionYear = Math.min(...years);
                const maxCollectionYear = Math.max(...years);
                collectionStartDate = minCollectionYear.toString();
                collectionEndDate = maxCollectionYear.toString();
            }
        }

        return { ...collection, collectionProjects, startDate: collectionStartDate, endDate: collectionEndDate };
    })
        .filter(c => c.collectionProjects.length > 0)
        .sort((a, b) => sortItems([a, b], sortBy, "name")[0] === a ? -1 : 1);

    const shownInCollections = new Set<string>();
    collectionsToRender.forEach(c => c.collectionProjects.forEach(p => shownInCollections.add(p.slug)));

    const standaloneLinks = sortedLinks.filter(link => !shownInCollections.has(link.slug));

    const hasOrcid = initialLinks.some(link => link.source === 'orcid');
    const hasManual = initialLinks.some(link => link.source === 'manual');
    const allTags = initialLinks.flatMap(link => link.tags || []);

    const anyResults = collectionsToRender.length > 0 || standaloneLinks.length > 0;
    const listIsSearching = (isSearching || !!searchQuery || sourceFilter !== 'all' || !!selectedTag) && !anyResults;

    return (
        <>
            {hasOrcid && hasManual && (
                <div className="mb-4 flex justify-center">
                    <div className="flex space-x-1 rounded-lg p-1" style={{
                        backgroundColor: 'var(--card-bg)',
                        borderColor: 'var(--card-border)',
                        border: '1px solid'
                    }}>
                        <button onClick={() => setSourceFilter('all')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors`} style={{
                            backgroundColor: sourceFilter === 'all' ? 'var(--primary-color)' : 'transparent',
                            color: sourceFilter === 'all' ? 'white' : 'var(--text-color)',
                            opacity: sourceFilter === 'all' ? 1 : 0.7
                        }}>
                            All
                        </button>
                        <button onClick={() => setSourceFilter('manual')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors`} style={{
                            backgroundColor: sourceFilter === 'manual' ? 'var(--primary-color)' : 'transparent',
                            color: sourceFilter === 'manual' ? 'white' : 'var(--text-color)',
                            opacity: sourceFilter === 'manual' ? 1 : 0.7
                        }}>Manual</button>
                        <button onClick={() => setSourceFilter('orcid')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors`} style={{
                            backgroundColor: sourceFilter === 'orcid' ? 'var(--primary-color)' : 'transparent',
                            color: sourceFilter === 'orcid' ? 'white' : 'var(--text-color)',
                            opacity: sourceFilter === 'orcid' ? 1 : 0.7
                        }}>ORCID</button>
                    </div>
                </div>
            )}
            <div className="mb-4 flex justify-center">
                <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-color)' }}>Sort by:</span>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as "alphabetical-asc" | "alphabetical-desc" | "newest" | "oldest")}
                        className="px-3 py-1 text-sm border rounded-md focus:outline-none focus:ring-2"
                        style={{
                            backgroundColor: 'var(--input-bg)',
                            borderColor: 'var(--input-border)',
                            color: 'var(--text-color)',
                            '--tw-ring-color': 'var(--primary-color)'
                        } as React.CSSProperties}
                    >
                        <option value="alphabetical-asc">Alphabetical (A-Z)</option>
                        <option value="alphabetical-desc">Alphabetical (Z-A)</option>
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                    </select>
                </div>
            </div>
            <SearchBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                resultsCount={searchQuery || sourceFilter !== 'all' || selectedTag ? (filteredLinks?.length ?? 0) : undefined}
            />

            <TagDirectory
                allTags={allTags}
                selectedTag={selectedTag}
                onTagSelect={setSelectedTag}
            />

            {collectionsToRender.map(collection => (
                <CollectionCard
                    key={collection.id}
                    id={collection.id}
                    name={collection.name}
                    description={collection.description}
                    projects={collection.collectionProjects}
                    tags={collection.tags}
                    highlights={highlights}
                    startDate={collection.startDate}
                    endDate={collection.endDate}
                    photoSet={collection.photoSet}
                />
            ))}

            {/* Only show 'no projects found' message when there are no results overall */}
            <ProjectList
                links={standaloneLinks}
                isSearching={listIsSearching}
                highlights={highlights}
            />

            <ProjectFooter totalProjects={initialLinks.length} isSearching={!!searchQuery || sourceFilter !== 'all' || !!selectedTag} />
        </>
    );
}
