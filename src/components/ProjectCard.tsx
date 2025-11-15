import React from "react";
import Image from "next/image";
import ShareButton from "./ShareButton";

interface ProjectCardProps {
    slug: string;
    target: string;
    title: string | null;
    description: string | null;
    tags: string[];
    source: "manual" | "orcid";
    shortUrl: string;
    highlights?: string[];
}

function highlightText(text: string, highlights: string[] = []): React.JSX.Element {
    if (!highlights.length) return <>{text}</>;

    let highlightedText = text;
    highlights.forEach(highlight => {
        const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        highlightedText = highlightedText.replace(regex, '<mark style="background-color: rgba(106, 142, 127, 0.3);">$1</mark>');
    });

    return <span dangerouslySetInnerHTML={{ __html: highlightedText }} />;
}

export default function ProjectCard({
    slug,
    target,
    title,
    description,
    tags,
    source,
    shortUrl,
    highlights = [],
}: ProjectCardProps) {
    const displayTitle =
        title ||
        slug
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");

    return (
        <div className="group block border rounded-lg p-6 hover:shadow-lg transition-all duration-200" style={{
            backgroundColor: 'var(--card-bg)',
            borderColor: 'var(--card-border)'
        }}>
            <div className="flex items-start justify-between gap-4">
                <a
                    href={target}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-0"
                >
                    <div className="flex items-center gap-3 mb-2">
                        {source === 'orcid' ? (
                            <Image src="/orcid.svg" alt="ORCID" width={20} height={20} className="dark:invert" />
                        ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                Manual
                            </span>
                        )}
                        <h2 className="text-xl font-semibold transition-colors" style={{ color: 'var(--text-color)' }}>
                            {highlightText(displayTitle, highlights)}
                        </h2>
                    </div>
                    {description && (
                        <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--text-color)', opacity: 0.7 }}>
                            {highlightText(description, highlights)}
                        </p>
                    )}
                    {tags && tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                            {tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                    style={{
                                        backgroundColor: highlights.some(h => tag.toLowerCase().includes(h.toLowerCase()))
                                            ? 'rgba(106, 142, 127, 0.3)'
                                            : 'var(--primary-color)',
                                        color: highlights.some(h => tag.toLowerCase().includes(h.toLowerCase()))
                                            ? 'var(--text-color)'
                                            : 'white',
                                        opacity: highlights.some(h => tag.toLowerCase().includes(h.toLowerCase())) ? 1 : 0.8
                                    }}
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                    <p className="text-xs truncate font-mono" style={{ color: 'var(--text-color)', opacity: 0.5 }}>
                        {target}
                    </p>
                </a>
                <div className="shrink-0">
                    <ShareButton title={displayTitle} shortUrl={shortUrl} />
                </div>
            </div>
        </div>
    );
}
