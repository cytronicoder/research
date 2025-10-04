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

  useEffect(() => {
    async function fetchLinks() {
      try {
        const response = await fetch("/api/directory");
        if (!response.ok) throw new Error("Failed to fetch links");
        const data = await response.json();
        // Remove analytics data for public view
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

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
            Research Projects
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            A curated collection of my research work, projects, and academic contributions
          </p>
        </header>

        {/* Content */}
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
        ) : links.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-16 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              No projects available at this time.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {links.map((link) => (
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

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-gray-200 dark:border-gray-800 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-500">
            {links.length > 0 && `${links.length} project${links.length === 1 ? "" : "s"} available`}
          </p>
        </footer>
      </div>
    </div>
  );
}

