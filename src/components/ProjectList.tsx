"use client";

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
    startDate?: string | null;
    endDate?: string | null;
    githubRepo?: string | null;
    photoSet?: PhotoSet | null;
}

interface ProjectListProps {
    links: LinkItem[];
    isSearching: boolean;
    highlights?: Record<string, string[]>;
}

export default function ProjectList({ links, isSearching, highlights }: ProjectListProps) {
    if (links.length === 0) {
        return (
            <div className="rounded-lg p-16 text-center" style={{
                backgroundColor: 'var(--card-bg)',
                borderColor: 'var(--card-border)',
                border: '1px solid'
            }}>
                <p className="text-lg" style={{ color: 'var(--text-color)', opacity: 0.7 }}>
                    {isSearching
                        ? "No projects found matching your search."
                        : "No projects available at this time."}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {links.map((link) => {
                const photoSet = link.photoSet;
                const slides = photoSet?.slides;
                return slides && slides.length > 0 ? (
                    <div key={link.slug}>
                        <ConferenceCarousel slides={slides} />
                    </div>
                ) : (
                    <ProjectCard
                        key={link.slug}
                        slug={link.slug}
                        target={link.target}
                        title={link.title}
                        description={link.description}
                        tags={link.tags}
                        source={link.source}
                        shortUrl={link.shortUrl}
                        highlights={highlights?.[link.slug]}
                        startDate={link.startDate}
                        endDate={link.endDate}
                        githubRepo={link.githubRepo}
                    />
                );
            })}
        </div>
    );
}
