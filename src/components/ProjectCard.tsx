interface ProjectCardProps {
    slug: string;
    target: string;
    title: string | null;
    description: string | null;
    tags: string[];
}

export default function ProjectCard({
    slug,
    target,
    title,
    description,
    tags,
}: ProjectCardProps) {
    const displayTitle =
        title ||
        slug
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");

    return (
        <a
            href={target}
            target="_blank"
            rel="noopener noreferrer"
            className="group block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-lg transition-all duration-200"
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {displayTitle}
                    </h2>
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
                </div>
                <div className="flex-shrink-0">
                    <svg
                        className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                    </svg>
                </div>
            </div>
        </a>
    );
}
