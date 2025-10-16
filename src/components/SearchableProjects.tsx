"use client";

import { useState, useEffect } from "react";
import SearchBar from "./SearchBar";
import ProjectList from "./ProjectList";
import ProjectFooter from "./ProjectFooter";
import TagDirectory from "./TagDirectory";

interface LinkItem {
    slug: string;
    target: string;
    shortUrl: string;
    title: string | null;
    description: string | null;
    tags: string[];
    source: "manual" | "orcid" | "openreview";
    clicks: number;
}

interface SearchResult {
    links: LinkItem[];
    total: number;
    highlights?: Record<string, string[]>;
}

interface SearchableProjectsProps {
    initialLinks: LinkItem[];
}

export default function SearchableProjects({ initialLinks }: SearchableProjectsProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [sourceFilter, setSourceFilter] = useState<"all" | "manual" | "orcid" | "openreview">("all");
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [filteredLinks, setFilteredLinks] = useState<LinkItem[]>(initialLinks);
    const [isSearching, setIsSearching] = useState(false);
    const [highlights, setHighlights] = useState<Record<string, string[]>>({});

    useEffect(() => {
        const performSearch = async () => {
            if (!searchQuery && sourceFilter === 'all' && !selectedTag) {
                setFilteredLinks(initialLinks);
                setHighlights({});
                return;
            }

            setIsSearching(true);
            try {
                const params = new URLSearchParams();
                if (searchQuery) params.append('q', searchQuery);
                if (sourceFilter !== 'all') params.append('source', sourceFilter);
                if (selectedTag) params.append('tags', selectedTag);

                const response = await fetch(`/api/search?${params.toString()}`);
                if (response.ok) {
                    const result: SearchResult = await response.json();
                    setFilteredLinks(result.links);
                    setHighlights(result.highlights || {});
                } else {
                    const searchFilteredLinks = initialLinks.filter(
                        (link) =>
                            link.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            link.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (link.title && link.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            (link.description && link.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            link.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
                    );

                    const sourceFilteredLinks = searchFilteredLinks.filter(link => {
                        if (sourceFilter === 'all') return true;
                        return link.source === sourceFilter;
                    });

                    const tagFilteredLinks = sourceFilteredLinks.filter(link => {
                        if (!selectedTag) return true;
                        return link.tags.some(tag => tag.toLowerCase() === selectedTag.toLowerCase());
                    });

                    setFilteredLinks(tagFilteredLinks);
                    setHighlights({});
                }
            } catch (error) {
                console.error('Search failed:', error);
                const searchFilteredLinks = initialLinks.filter(
                    (link) =>
                        link.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        link.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (link.title && link.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
                        (link.description && link.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                        link.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
                );

                const sourceFilteredLinks = searchFilteredLinks.filter(link => {
                    if (sourceFilter === 'all') return true;
                    return link.source === sourceFilter;
                });

                const tagFilteredLinks = sourceFilteredLinks.filter(link => {
                    if (!selectedTag) return true;
                    return link.tags.some(tag => tag.toLowerCase() === selectedTag.toLowerCase());
                });

                setFilteredLinks(tagFilteredLinks);
                setHighlights({});
            } finally {
                setIsSearching(false);
            }
        };

        const debounceTimer = setTimeout(performSearch, 300);
        return () => clearTimeout(debounceTimer);
    }, [searchQuery, sourceFilter, selectedTag, initialLinks]);

    const hasOrcid = initialLinks.some(link => link.source === 'orcid');
    const hasManual = initialLinks.some(link => link.source === 'manual');
    const hasOpenReview = initialLinks.some(link => link.source === 'openreview');
    const allTags = initialLinks.flatMap(link => link.tags);

    return (
        <>
            {(hasOrcid || hasManual || hasOpenReview) && (Number(hasOrcid) + Number(hasManual) + Number(hasOpenReview)) > 1 && (
                <div className="mb-4 flex justify-center">
                    <div className="flex space-x-1 rounded-lg bg-gray-200 dark:bg-gray-800 p-1">
                        <button onClick={() => setSourceFilter('all')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${sourceFilter === 'all' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>All</button>
                        {hasManual && <button onClick={() => setSourceFilter('manual')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${sourceFilter === 'manual' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>Manual</button>}
                        {hasOrcid && <button onClick={() => setSourceFilter('orcid')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${sourceFilter === 'orcid' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>ORCID</button>}
                        {hasOpenReview && <button onClick={() => setSourceFilter('openreview')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${sourceFilter === 'openreview' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>OpenReview</button>}
                    </div>
                </div>
            )}
            <SearchBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                resultsCount={searchQuery || sourceFilter !== 'all' || selectedTag ? filteredLinks.length : undefined}
            />

            <TagDirectory
                allTags={allTags}
                selectedTag={selectedTag}
                onTagSelect={setSelectedTag}
            />

            <ProjectList
                links={filteredLinks}
                isSearching={isSearching || !!searchQuery || sourceFilter !== 'all' || !!selectedTag}
                highlights={highlights}
            />

            <ProjectFooter totalProjects={initialLinks.length} isSearching={!!searchQuery || sourceFilter !== 'all' || !!selectedTag} />
        </>
    );
}
