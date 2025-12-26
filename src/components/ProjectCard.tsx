import Image from "next/image";
import React from "react";
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
    startDate?: string | null;
    endDate?: string | null;
    githubRepo?: string | null;
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
    startDate,
    endDate,
    githubRepo,
}: ProjectCardProps) {
    const displayTitle =
        title ||
        slug
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");

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

    return (
        <div className="group block border rounded-lg p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 relative" style={{
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
                        {source === 'orcid' && (
                            <Image src="/orcid.svg" alt="ORCID" width={20} height={20} style={{ filter: 'var(--icon-filter, none)' }} />
                        )}
                        <h2 className="text-xl font-semibold transition-colors" style={{ color: 'var(--text-color)' }}>
                            {highlightText(displayTitle, highlights)}
                            {dateDisplay && (
                                <span className="text-base font-normal ml-2" style={{ color: 'var(--text-color)', opacity: 0.5 }}>
                                    {dateDisplay}
                                </span>
                            )}
                        </h2>
                    </div>
                    {description && (
                        <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--text-color)', opacity: 0.7 }}>
                            {highlightText(description, highlights)}
                        </p>
                    )}
                    {tags && tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                            {[...tags].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())).map((tag) => (
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
            {githubRepo && (
                <a
                    href={githubRepo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-2 right-2 p-2 rounded-full transition-colors opacity-50 hover:opacity-100"
                    style={{
                        backgroundColor: 'transparent',
                        cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    title="View on GitHub"
                >
                    <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        style={{ color: 'var(--text-color)' }}
                    >
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                </a>
            )}
        </div>
    );
}
