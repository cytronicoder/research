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
}

export default function ProjectCard({
    slug,
    target,
    title,
    description,
    tags,
    source,
    shortUrl,
}: ProjectCardProps) {
    const displayTitle =
        title ||
        slug
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");

    return (
        <div className="group block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-lg transition-all duration-200">
            <div className="flex items-start justify-between gap-4">
                <a
                    href={target}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-0"
                >
                    <div className="flex items-center gap-3 mb-2">
                        {source === 'orcid' && (
                            <Image src="/orcid.svg" alt="ORCID" width={20} height={20} className="dark:invert" />
                        )}
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {displayTitle}
                        </h2>
                    </div>
                    {description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                            {description}
                        </p>
                    )}
                    {tags && tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                            {tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-500 truncate font-mono">
                        {target}
                    </p>
                </a>
                <div className="flex-shrink-0">
                    <ShareButton title={displayTitle} shortUrl={shortUrl} />
                </div>
            </div>
        </div>
    );
}
