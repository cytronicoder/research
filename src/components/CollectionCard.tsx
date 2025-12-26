"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import ProjectCard from "./ProjectCard";
import ConferenceCarousel from "./ConferenceCarousel";
import type { PhotoSet } from "@/lib/conferenceSlides";

interface LinkItem {
    slug: string;
    target: string;
    shortUrl: string;
    title: string | null;
    description: string | null;
    tags: string[];
    source: "manual" | "orcid";
    highlights?: string[];
    startDate?: string | null;
    endDate?: string | null;
}

interface CollectionProps {
    id: string;
    name: string;
    description: string;
    projects: LinkItem[];
    tags?: string[];
    highlights?: Record<string, string[]>;
    startDate?: string | null;
    endDate?: string | null;
    photoSet?: PhotoSet | null;
}

export default function CollectionCard({ id, name, description, projects, tags = [], highlights, startDate, endDate, photoSet }: CollectionProps) {
    const [isExpanded, setIsExpanded] = useState<boolean>(true);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(`collection:collapsed:${id}`);
            if (stored === "1") setIsExpanded(false);
            else if (stored === "0") setIsExpanded(true);
        } catch (e) {
            console.error("Error reading collection expanded state:", e);
        }
    }, [id]);

    // photo set provided from server via props
    const collectionPhotoSet = photoSet;
    const collectionSlides = collectionPhotoSet?.slides;

    if (projects.length === 0) return null;

    const extractYear = (dateString: string | null | undefined): string | null => {
        if (!dateString) return null;
        return dateString.substring(0, 4);
    };

    const extractMonth = (dateString: string | null | undefined): string | null => {
        if (!dateString || dateString.length < 7) return null;
        const monthNum = parseInt(dateString.substring(5, 7), 10);
        if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) return null;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months[monthNum - 1];
    };

    const formatDate = (dateString: string | null | undefined, isRange: boolean = false): string | null => {
        if (!dateString) return null;
        const year = extractYear(dateString);
        const month = extractMonth(dateString);
        const showPresent = isRange && year === new Date().getFullYear().toString() && !month;
        const formattedYear = year ? (showPresent ? "present" : year) : null;
        return month && formattedYear ? `${month} ${formattedYear}` : formattedYear;
    };

    const startDateDisplay = formatDate(startDate);
    const endDateDisplay = formatDate(endDate);

    let dateDisplay = "";
    if (startDateDisplay && endDateDisplay && startDateDisplay === endDateDisplay) {
        dateDisplay = ` (${startDateDisplay})`;
    } else if (startDateDisplay && endDateDisplay) {
        dateDisplay = ` (${formatDate(startDate, true)}-${formatDate(endDate, true)})`;
    } else if (startDateDisplay) {
        dateDisplay = ` (${startDateDisplay})`;
    } else if (endDateDisplay) {
        dateDisplay = ` (${endDateDisplay})`;
    }

    const getProjectTags = (projectTags: string[]) => {
        const merged = [...new Set([...(projectTags || []), ...(tags || [])])];
        return merged;
    };

    return (
        <div className="border rounded-xl mb-8 transition-all duration-200 hover:shadow-md" style={{
            borderColor: 'var(--card-border)',
            backgroundColor: 'var(--background-color)',
            borderWidth: '1px'
        }}>
            <div
                className="p-6 flex justify-between items-start cursor-pointer select-none hover:opacity-80 transition-opacity"
                onClick={() => {
                    const next = !isExpanded;
                    setIsExpanded(next);
                    try {
                        localStorage.setItem(`collection:collapsed:${id}`, next ? "0" : "1");
                    } catch (e) {
                        console.error("Error saving collection expanded state:", e);
                    }
                }}
            >
                <div className="flex-1 pr-4">
                    <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-color)' }}>
                            {name}
                            {dateDisplay && (
                                <span className="text-lg font-normal ml-2" style={{ color: 'var(--text-color)', opacity: 0.5 }}>
                                    {dateDisplay}
                                </span>
                            )}
                        </h2>
                        {tags.length > 0 && (
                            <div className="flex gap-2">
                                {tags.map(tag => (
                                    <span key={tag} className="text-xs px-2 py-1 rounded-full opacity-70" style={{
                                        backgroundColor: 'var(--card-bg)',
                                        border: '1px solid var(--card-border)',
                                        color: 'var(--text-color)'
                                    }}>
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    {description && (
                        <p className="opacity-70 text-lg" style={{ color: 'var(--text-color)' }}>{description}</p>
                    )}
                </div>
                <div className="mt-1 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-all duration-200 hover:scale-110 active:scale-95" style={{ color: 'var(--text-color)' }}>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
            </div>

            {isExpanded && (
                <div>
                    {/* Show collection-specific content (e.g., carousel for bioRSP) */}
                    {collectionSlides && collectionSlides.length > 0 && (
                        <div className="px-6 pt-0 pb-4">
                            <ConferenceCarousel slides={collectionSlides} />
                        </div>
                    )}

                    <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        {projects.map((project) => (
                            <ProjectCard
                                key={project.slug}
                                slug={project.slug}
                                target={project.target}
                                title={project.title}
                                description={project.description}
                                tags={getProjectTags(project.tags)}
                                source={project.source}
                                shortUrl={project.shortUrl}
                                highlights={highlights?.[project.slug]}
                                startDate={project.startDate}
                                endDate={project.endDate}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
