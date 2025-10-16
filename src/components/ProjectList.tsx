import ProjectCard from "./ProjectCard";

interface LinkItem {
    slug: string;
    target: string;
    shortUrl: string;
    title: string | null;
    description: string | null;
    tags: string[];
    source: "manual" | "orcid" | "openreview";
}

interface ProjectListProps {
    links: LinkItem[];
    isSearching: boolean;
}

export default function ProjectList({ links, isSearching }: ProjectListProps) {
    if (links.length === 0) {
        return (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-16 text-center">
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                    {isSearching
                        ? "No projects found matching your search."
                        : "No projects available at this time."}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {links.map((link) => (
                <ProjectCard
                    key={link.slug}
                    slug={link.slug}
                    target={link.target}
                    title={link.title}
                    description={link.description}
                    tags={link.tags}
                    source={link.source}
                    shortUrl={link.shortUrl}
                />
            ))}
        </div>
    );
}
