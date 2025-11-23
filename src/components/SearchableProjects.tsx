"use client";

import { useState, useEffect } from "react";
import SearchBar from "./SearchBar";
import ProjectList from "./ProjectList";
import ProjectFooter from "./ProjectFooter";
import TagDirectory from "./TagDirectory";
import CollectionCard from "./CollectionCard";

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

interface CollectionItem {
    id: string;
    name: string;
    description: string;
    projects: string[];
    tags?: string[];
    createdAt: string | null;
}

interface SearchResult {
    links: LinkItem[];
    total: number;
    highlights?: Record<string, string[]>;
}

interface SearchableProjectsProps {
    initialLinks: LinkItem[];
    initialCollections?: CollectionItem[];
}

export default function SearchableProjects({ initialLinks, initialCollections = [] }: SearchableProjectsProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [sourceFilter, setSourceFilter] = useState<"all" | "manual" | "orcid">("all");
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [filteredLinks, setFilteredLinks] = useState<LinkItem[]>(initialLinks);
    const [isSearching, setIsSearching] = useState(false);
    const [highlights, setHighlights] = useState<Record<string, string[]>>({});
    const [sortBy, setSortBy] = useState<"alphabetical-asc" | "alphabetical-desc" | "newest" | "oldest">("alphabetical-asc");

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

    const sortedLinks = [...(filteredLinks || [])].sort((a, b) => {
        switch (sortBy) {
            case "alphabetical-asc":
                const titleA = a.title || a.slug;
                const titleB = b.title || b.slug;
                return titleA.localeCompare(titleB);
            case "alphabetical-desc":
                const titleADesc = a.title || a.slug;
                const titleBDesc = b.title || b.slug;
                return titleBDesc.localeCompare(titleADesc);
            case "newest":
                if (a.createdAt && b.createdAt) {
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                }
                return b.slug.localeCompare(a.slug);
            case "oldest":
                if (a.createdAt && b.createdAt) {
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                }
                return a.slug.localeCompare(b.slug);
            default:
                return 0;
        }
    });

    const collectionsToRender = initialCollections.map(collection => {
        const matchesCollectionName = searchQuery && (
            collection.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            collection.description.toLowerCase().includes(searchQuery.toLowerCase())
        );

        const matchesCollectionTag = selectedTag && collection.tags && collection.tags.some(t => t.toLowerCase() === selectedTag.toLowerCase());

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

        collectionProjects.sort((a, b) => {
            switch (sortBy) {
                case "alphabetical-asc":
                    return (a.title || a.slug).localeCompare(b.title || b.slug);
                case "alphabetical-desc":
                    return (b.title || b.slug).localeCompare(a.title || a.slug);
                case "newest":
                    if (a.createdAt && b.createdAt) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                    return b.slug.localeCompare(a.slug);
                case "oldest":
                    if (a.createdAt && b.createdAt) return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                    return a.slug.localeCompare(b.slug);
                default:
                    return 0;
            }
        });

        return { ...collection, collectionProjects };
    })
        .filter(c => c.collectionProjects.length > 0)
        .sort((a, b) => {
            switch (sortBy) {
                case "alphabetical-asc":
                    return a.name.localeCompare(b.name);
                case "alphabetical-desc":
                    return b.name.localeCompare(a.name);
                case "newest":
                    if (a.createdAt && b.createdAt) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                    return b.name.localeCompare(a.name);
                case "oldest":
                    if (a.createdAt && b.createdAt) return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                    return a.name.localeCompare(b.name);
                default:
                    return 0;
            }
        });

    const shownInCollections = new Set<string>();
    collectionsToRender.forEach(c => c.collectionProjects.forEach(p => shownInCollections.add(p.slug)));

    const standaloneLinks = sortedLinks.filter(link => !shownInCollections.has(link.slug));

    const hasOrcid = initialLinks.some(link => link.source === 'orcid');
    const hasManual = initialLinks.some(link => link.source === 'manual');
    const allTags = initialLinks.flatMap(link => link.tags || []);

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
                />
            ))}

            <ProjectList
                links={standaloneLinks}
                isSearching={isSearching || !!searchQuery || sourceFilter !== 'all' || !!selectedTag}
                highlights={highlights}
            />

            <ProjectFooter totalProjects={initialLinks.length} isSearching={!!searchQuery || sourceFilter !== 'all' || !!selectedTag} />
        </>
    );
}
