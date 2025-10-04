"use client";

import { useState } from "react";
import SearchBar from "./SearchBar";
import ProjectList from "./ProjectList";
import ProjectFooter from "./ProjectFooter";

interface LinkItem {
    slug: string;
    target: string;
    shortUrl: string;
    title: string | null;
    description: string | null;
    tags: string[];
}

interface SearchableProjectsProps {
    initialLinks: LinkItem[];
}

export default function SearchableProjects({ initialLinks }: SearchableProjectsProps) {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredLinks = initialLinks.filter(
        (link) =>
            link.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
            link.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
            link.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            link.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            link.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <>
            <SearchBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                resultsCount={searchQuery ? filteredLinks.length : undefined}
            />

            <ProjectList links={filteredLinks} isSearching={!!searchQuery} />

            <ProjectFooter totalProjects={initialLinks.length} isSearching={!!searchQuery} />
        </>
    );
}
