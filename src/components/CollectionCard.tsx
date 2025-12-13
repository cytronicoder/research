"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import ProjectCard from "./ProjectCard";

interface LinkItem {
    slug: string;
    target: string;
    shortUrl: string;
    title: string | null;
    description: string | null;
    tags: string[];
    source: "manual" | "orcid";
    highlights?: string[];
}

interface CollectionProps {
    id: string;
    name: string;
    description: string;
    projects: LinkItem[];
    tags?: string[];
    highlights?: Record<string, string[]>;
}

export default function CollectionCard({ id, name, description, projects, tags = [], highlights }: CollectionProps) {
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

    if (projects.length === 0) return null;

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
                        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-color)' }}>{name}</h2>
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
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
