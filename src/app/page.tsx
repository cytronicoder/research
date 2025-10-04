"use client";

import { useEffect, useState } from "react";

interface LinkItem {
  slug: string;
  target: string;
  shortUrl: string;
  title: string | null;
  description: string | null;
  tags: string[];
}

export default function Home() {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchLinks() {
      try {
        const response = await fetch("/api/directory");
        if (!response.ok) throw new Error("Failed to fetch links");
        const data = await response.json();
        setLinks(
          data.links.map((link: LinkItem & { clicks: number; createdAt: string | null }) => ({
            slug: link.slug,
            target: link.target,
            shortUrl: link.shortUrl,
            title: link.title,
            description: link.description,
            tags: link.tags,
          }))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load links");
      } finally {
        setLoading(false);
      }
    }

    fetchLinks();
  }, []);

  const filteredLinks = links.filter(
    (link) =>
      link.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <header className="mb-12">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search my research projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 text-lg border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              {filteredLinks.length} result{filteredLinks.length === 1 ? "" : "s"} found
            </p>
          )}
        </header>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
            <p className="mt-6 text-gray-600 dark:text-gray-400">
              Loading projects...
            </p>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-8 text-center">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-16 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              {searchQuery
                ? "No projects found matching your search."
                : "No projects available at this time."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLinks.map((link) => (
              <a
                key={link.slug}
                href={link.target}
                target="_blank"
                rel="noopener noreferrer"
                className="group block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {link.title || link.slug
                        .split("-")
                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(" ")}
                    </h2>
                    {link.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                        {link.description}
                      </p>
                    )}
                    {link.tags && link.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {link.tags.map((tag) => (
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
                      {link.target}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
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
            ))}
          </div>
        )}

        <footer className="mt-20 pt-8 border-t border-gray-200 dark:border-gray-800 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-500">
            {links.length > 0 && !searchQuery && `${links.length} project${links.length === 1 ? "" : "s"} available!`} Visit my <a href="https://cytronicoder.com/resume" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">resume</a> to see all my work.
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
            Check out my <a href="https://github.com/cytronicoder" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">GitHub</a> for more projects and <a href="https://cytronicoder.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">portfolio</a> for more information.
          </p>
        </footer>
      </div>
    </div>
  );
}

