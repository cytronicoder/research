"use client";

import ThemeToggle from "@/components/ThemeToggle";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface ApiLinkItem {
    slug: string;
    target: string;
    clicks: number;
    metadata?: {
        title?: string;
        description?: string;
        tags?: string[];
        createdAt?: string;
    };
}

interface LinkItem {
    slug: string;
    target: string;
    clicks: number;
    shortUrl: string;
    title: string | null;
    description: string | null;
    tags: string[];
    createdAt: string | null;
}

interface AnalyticsData {
    totalLinks: number;
    totalClicks: number;
    sources: { manual: number; orcid: number };
    topTags: [string, number][];
    recentActivity: Array<{ slug: string, clicks: number, lastAccessed?: string }>;
    topPerformers: Array<{ slug: string, clicks: number, title?: string }>;
    avgClicksPerLink: number;
    uniqueTags: number;
}

export default function AdminDashboard() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState("");
    const [authError, setAuthError] = useState("");
    const [links, setLinks] = useState<LinkItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set());
    const [bulkAction, setBulkAction] = useState<"delete" | "addTags" | "removeTags" | null>(null);
    const [bulkTagInput, setBulkTagInput] = useState("");
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [analyticsPeriod, setAnalyticsPeriod] = useState<"all" | "week" | "month" | "year">("all");
    const [editingSlug, setEditingSlug] = useState<string | null>(null);
    const [editValues, setEditValues] = useState<{
        title: string;
        description: string;
        target: string;
        tags: string[];
    } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const auth = sessionStorage.getItem("admin_authenticated");
        if (auth === "true") {
            setIsAuthenticated(true);
            fetchLinks();
        }
    }, []);

    function handleSelectAll() {
        if (selectedLinks.size === filteredLinks.length) {
            setSelectedLinks(new Set());
        } else {
            setSelectedLinks(new Set(filteredLinks.map(link => link.slug)));
        }
    }

    function handleSelectLink(slug: string) {
        const newSelected = new Set(selectedLinks);
        if (newSelected.has(slug)) {
            newSelected.delete(slug);
        } else {
            newSelected.add(slug);
        }
        setSelectedLinks(newSelected);
    }

    async function handleAuth(e: React.FormEvent) {
        e.preventDefault();
        setAuthError("");

        try {
            const response = await fetch("/api/auth", {
                headers: {
                    "x-admin-key": password,
                },
            });

            if (response.ok) {
                sessionStorage.setItem("admin_authenticated", "true");
                sessionStorage.setItem("admin_key", password);
                setIsAuthenticated(true);
                fetchLinks();
            } else {
                setAuthError("Invalid admin key");
            }
        } catch {
            setAuthError("Authentication failed");
        }
    }

    async function fetchLinks() {
        setLoading(true);
        console.log("Fetching links...");
        try {
            const response = await fetch(`/api/links?_t=${Date.now()}`, {
                headers: {
                    "x-admin-key": sessionStorage.getItem("admin_key") || "",
                },
                cache: "no-store",
            });
            if (!response.ok) throw new Error("Failed to fetch links");
            const data = await response.json();
            console.log("Fetched links data:", data);

            const transformedLinks = data.links.map((link: ApiLinkItem) => ({
                slug: link.slug,
                target: link.target,
                clicks: link.clicks,
                shortUrl: `${window.location.origin}/${link.slug}`,
                title: link.metadata?.title || null,
                description: link.metadata?.description || null,
                tags: link.metadata?.tags || [],
                createdAt: link.metadata?.createdAt || null,
            }));

            console.log("Setting links, count:", transformedLinks.length);
            setLinks(transformedLinks);
        } catch (err) {
            console.error("Error fetching links:", err);
            setError(err instanceof Error ? err.message : "Failed to load links");
        } finally {
            setLoading(false);
        }
    }

    const fetchAnalytics = useCallback(async () => {
        try {
            const response = await fetch(`/api/stats?period=${analyticsPeriod}`, {
                headers: {
                    "x-admin-key": sessionStorage.getItem("admin_key") || "",
                },
            });
            if (response.ok) {
                const data = await response.json();
                setAnalytics(data);
            }
        } catch (err) {
            console.error("Failed to fetch analytics:", err);
        }
    }, [analyticsPeriod]);

    useEffect(() => {
        if (showAnalytics && isAuthenticated) {
            fetchAnalytics();
        }
    }, [showAnalytics, analyticsPeriod, isAuthenticated, fetchAnalytics]);

    async function handleBulkDelete() {
        if (selectedLinks.size === 0 || isDeleting) return;

        if (!confirm(`Are you sure you want to delete ${selectedLinks.size} link${selectedLinks.size === 1 ? "" : "s"}?`)) return;

        const slugs = Array.from(selectedLinks).join(",");
        console.log("Deleting slugs:", slugs);
        setIsDeleting(true);
        try {
            const response = await fetch(`/api/links?slugs=${slugs}`, {
                method: "DELETE",
                headers: {
                    "x-admin-key": sessionStorage.getItem("admin_key") || "",
                },
            });

            console.log("Delete response:", response.status);
            if (response.ok) {
                const result = await response.json();
                console.log("Deleted:", result);
                setSelectedLinks(new Set());
                await fetchLinks();
            } else {
                const error = await response.text();
                console.error("Delete failed:", error);
                alert(`Failed to delete selected links: ${error}`);
            }
        } catch (err) {
            console.error("Delete error:", err);
            alert(`Error deleting links: ${err}`);
        } finally {
            setIsDeleting(false);
        }
    }

    async function handleIndividualDelete(slug: string) {
        if (isDeleting) return;

        if (!confirm(`Are you sure you want to delete the link "/${slug}"?`)) return;

        console.log("Deleting individual slug:", slug);
        setIsDeleting(true);
        try {
            const response = await fetch(`/api/links?slug=${slug}`, {
                method: "DELETE",
                headers: {
                    "x-admin-key": sessionStorage.getItem("admin_key") || "",
                },
            });

            console.log("Delete response:", response.status);
            if (response.ok) {
                const result = await response.json();
                console.log("Deleted:", result);
                await fetchLinks();
            } else {
                const error = await response.text();
                console.error("Delete failed:", error);
                alert(`Failed to delete link: ${error}`);
            }
        } catch (err) {
            console.error("Delete error:", err);
            alert(`Error deleting link: ${err}`);
        } finally {
            setIsDeleting(false);
        }
    }

    function handleStartEdit(link: LinkItem) {
        setEditingSlug(link.slug);
        setEditValues({
            title: link.title || "",
            description: link.description || "",
            target: link.target,
            tags: [...link.tags],
        });
    }

    function handleCancelEdit() {
        setEditingSlug(null);
        setEditValues(null);
    }

    async function handleSaveEdit() {
        if (!editingSlug || !editValues) return;

        try {
            const response = await fetch("/api/links", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "x-admin-key": sessionStorage.getItem("admin_key") || "",
                },
                body: JSON.stringify({
                    slug: editingSlug,
                    target: editValues.target,
                    title: editValues.title,
                    description: editValues.description,
                    tags: editValues.tags,
                }),
            });

            if (response.ok) {
                setEditingSlug(null);
                setEditValues(null);
                fetchLinks();
            } else {
                alert("Failed to update link");
            }
        } catch {
            alert("Error updating link");
        }
    }

    async function handleBulkAddTags() {
        if (selectedLinks.size === 0 || !bulkTagInput.trim()) return;

        const tags = bulkTagInput.split(",").map(t => t.trim()).filter(t => t);
        try {
            const response = await fetch("/api/tags", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-admin-key": sessionStorage.getItem("admin_key") || "",
                },
                body: JSON.stringify({
                    slugs: Array.from(selectedLinks),
                    tags,
                }),
            });

            if (response.ok) {
                setSelectedLinks(new Set());
                setBulkAction(null);
                setBulkTagInput("");
                fetchLinks();
            } else {
                alert("Failed to add tags");
            }
        } catch {
            alert("Error adding tags");
        }
    }

    async function handleBulkRemoveTags() {
        if (selectedLinks.size === 0 || !bulkTagInput.trim()) return;

        const tags = bulkTagInput.split(",").map(t => t.trim()).filter(t => t);
        try {
            const response = await fetch("/api/tags", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "x-admin-key": sessionStorage.getItem("admin_key") || "",
                },
                body: JSON.stringify({
                    slugs: Array.from(selectedLinks),
                    tags,
                }),
            });

            if (response.ok) {
                setSelectedLinks(new Set());
                setBulkAction(null);
                setBulkTagInput("");
                fetchLinks();
            } else {
                alert("Failed to remove tags");
            }
        } catch {
            alert("Error removing tags");
        }
    }

    async function handleExport(format: "json" | "csv") {
        try {
            const response = await fetch(`/api/export?format=${format}`, {
                headers: {
                    "x-admin-key": sessionStorage.getItem("admin_key") || "",
                },
            });
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `research-export-${new Date().toISOString().split('T')[0]}.${format}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                alert("Failed to export data");
            }
        } catch {
            alert("Error exporting data");
        }
    }

    function handleLogout() {
        sessionStorage.removeItem("admin_authenticated");
        sessionStorage.removeItem("admin_key");
        setIsAuthenticated(false);
        setPassword("");
        setLinks([]);
    }

    const filteredLinks = links.filter(
        (link) =>
            link.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
            link.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
            link.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            link.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            link.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const totalClicks = links.reduce((sum, link) => sum + link.clicks, 0);

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--background)' }}>
                <div className="max-w-md w-full">
                    <div className="rounded-lg shadow-2xl p-8" style={{ backgroundColor: 'var(--card-bg)' }}>
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-color)' }}>
                                Admin Dashboard
                            </h1>
                            <p style={{ color: 'var(--text-color)', opacity: 0.7 }}>
                                Enter your admin key to continue
                            </p>
                        </div>

                        <form onSubmit={handleAuth} className="space-y-6">
                            <div>
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-medium mb-2"
                                    style={{ color: 'var(--text-color)' }}
                                >
                                    Admin Key
                                </label>
                                <input
                                    type="password"
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:border-transparent"
                                    style={{
                                        backgroundColor: 'var(--input-bg)',
                                        borderColor: 'var(--input-border)',
                                        color: 'var(--text-color)',
                                        '--tw-ring-color': 'var(--primary-color)'
                                    } as React.CSSProperties}
                                    placeholder="Enter admin key"
                                    required
                                />
                            </div>

                            {authError && (
                                <div className="rounded-lg p-3 border" style={{
                                    backgroundColor: 'var(--error-bg)',
                                    borderColor: 'var(--error-border)'
                                }}>
                                    <p className="text-sm" style={{ color: 'var(--error-text)' }}>
                                        {authError}
                                    </p>
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
                                style={{
                                    backgroundColor: 'var(--button-primary)',
                                    '--tw-ring-color': 'var(--primary-color)'
                                } as React.CSSProperties}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--button-primary-hover)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--button-primary)'}
                            >
                                Sign In
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <Link
                                href="/"
                                className="text-sm transition-colors"
                                style={{ color: 'var(--text-color)', opacity: 0.7 }}
                            >
                                ← Back to home
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--background-color)' }}>
            <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
                <header className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-4xl sm:text-5xl font-bold mb-2" style={{ color: 'var(--text-color)' }}>
                            Admin Dashboard
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 text-sm font-medium border rounded-lg transition-colors"
                            style={{
                                color: 'var(--text-color)',
                                backgroundColor: 'var(--card-bg)',
                                borderColor: 'var(--card-border)'
                            }}
                        >
                            Logout
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                                    Total Links
                                </div>
                                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                                    {links.length}
                                </div>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                                <svg
                                    className="w-6 h-6 text-blue-600 dark:text-blue-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                                    Total Clicks
                                </div>
                                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                                    {totalClicks.toLocaleString()}
                                </div>
                            </div>
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                                <svg
                                    className="w-6 h-6 text-green-600 dark:text-green-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                                    Avg. Clicks/Link
                                </div>
                                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                                    {links.length > 0
                                        ? Math.round(totalClicks / links.length)
                                        : 0}
                                </div>
                            </div>
                            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                                <svg
                                    className="w-6 h-6 text-purple-600 dark:text-purple-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-4 mb-6">
                    <button
                        onClick={() => setShowAnalytics(!showAnalytics)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        {showAnalytics ? "Hide Analytics" : "Show Analytics"}
                    </button>
                    <button
                        onClick={() => handleExport("json")}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        Export JSON
                    </button>
                    <button
                        onClick={() => handleExport("csv")}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        Export CSV
                    </button>
                </div>

                {/* Analytics View */}
                {showAnalytics && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h2>
                            <select
                                value={analyticsPeriod}
                                onChange={(e) => setAnalyticsPeriod(e.target.value as "all" | "week" | "month" | "year")}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                <option value="all">All Time</option>
                                <option value="week">Last Week</option>
                                <option value="month">Last Month</option>
                                <option value="year">Last Year</option>
                            </select>
                        </div>

                        {analytics ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Overview</h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Total Links:</span>
                                            <span className="font-medium">{analytics.totalLinks}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Total Clicks:</span>
                                            <span className="font-medium">{analytics.totalClicks.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Avg Clicks/Link:</span>
                                            <span className="font-medium">{analytics.avgClicksPerLink}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Unique Tags:</span>
                                            <span className="font-medium">{analytics.uniqueTags}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sources</h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Manual:</span>
                                            <span className="font-medium">{analytics.sources.manual}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">ORCID:</span>
                                            <span className="font-medium">{analytics.sources.orcid}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Tags</h3>
                                    <div className="space-y-2">
                                        {analytics.topTags.slice(0, 5).map(([tag, count]) => (
                                            <div key={tag} className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">{tag}:</span>
                                                <span className="font-medium">{count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
                                <p className="mt-2 text-gray-600 dark:text-gray-400">Loading analytics...</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Bulk Actions */}
                {selectedLinks.size > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                {selectedLinks.size} link{selectedLinks.size === 1 ? "" : "s"} selected
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setBulkAction("addTags")}
                                    className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                                >
                                    Add Tags
                                </button>
                                <button
                                    onClick={() => setBulkAction("removeTags")}
                                    className="px-3 py-1 text-xs bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors"
                                >
                                    Remove Tags
                                </button>
                                <button
                                    onClick={handleBulkDelete}
                                    disabled={isDeleting}
                                    className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isDeleting ? "Deleting..." : "Delete"}
                                </button>
                            </div>
                        </div>

                        {bulkAction && (
                            <div className="mt-4 flex gap-2">
                                <input
                                    type="text"
                                    placeholder={bulkAction === "addTags" ? "tag1, tag2, tag3" : "tag1, tag2"}
                                    value={bulkTagInput}
                                    onChange={(e) => setBulkTagInput(e.target.value)}
                                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                <button
                                    onClick={bulkAction === "addTags" ? handleBulkAddTags : handleBulkRemoveTags}
                                    className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                                >
                                    Apply
                                </button>
                                <button
                                    onClick={() => {
                                        setBulkAction(null);
                                        setBulkTagInput("");
                                    }}
                                    className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <div className="mb-8">
                    <input
                        type="text"
                        placeholder="Search links..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
                        <p className="mt-4 text-gray-600 dark:text-gray-400">
                            Loading links...
                        </p>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
                        <p className="text-red-600 dark:text-red-400">{error}</p>
                    </div>
                ) : filteredLinks.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                        <p className="text-gray-600 dark:text-gray-400">
                            {searchQuery
                                ? "No links found matching your search."
                                : "No links yet."}
                        </p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-900">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            <input
                                                type="checkbox"
                                                checked={selectedLinks.size === filteredLinks.length && filteredLinks.length > 0}
                                                onChange={handleSelectAll}
                                                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400"
                                            />
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Short Link
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Title
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Description
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Tags
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Destination
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Clicks
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredLinks.map((link) => (
                                        <tr
                                            key={link.slug}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedLinks.has(link.slug)}
                                                    onChange={() => handleSelectLink(link.slug)}
                                                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400"
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Link
                                                    href={link.shortUrl}
                                                    prefetch={false}
                                                    className="text-blue-600 dark:text-blue-400 hover:underline font-mono font-medium"
                                                >
                                                    /{link.slug}
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4">
                                                {editingSlug === link.slug ? (
                                                    <input
                                                        type="text"
                                                        value={editValues?.title || ""}
                                                        onChange={(e) => setEditValues(prev => prev ? { ...prev, title: e.target.value } : null)}
                                                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                        placeholder="Enter title"
                                                    />
                                                ) : (
                                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {link.title || <span className="text-gray-400 italic">No title</span>}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 max-w-xs">
                                                {editingSlug === link.slug ? (
                                                    <textarea
                                                        value={editValues?.description || ""}
                                                        onChange={(e) => setEditValues(prev => prev ? { ...prev, description: e.target.value } : null)}
                                                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                                                        placeholder="Enter description"
                                                        rows={2}
                                                    />
                                                ) : (
                                                    <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                                        {link.description || <span className="italic">No description</span>}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {editingSlug === link.slug ? (
                                                    <input
                                                        type="text"
                                                        value={editValues?.tags.join(", ") || ""}
                                                        onChange={(e) => setEditValues(prev => prev ? { ...prev, tags: e.target.value.split(",").map(t => t.trim()).filter(t => t) } : null)}
                                                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                        placeholder="tag1, tag2, tag3"
                                                    />
                                                ) : (
                                                    <div className="flex flex-wrap gap-1">
                                                        {link.tags.length > 0 ? (
                                                            link.tags.map((tag) => (
                                                                <span
                                                                    key={tag}
                                                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                                                                >
                                                                    {tag}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-sm text-gray-400 italic">No tags</span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {editingSlug === link.slug ? (
                                                    <input
                                                        type="url"
                                                        value={editValues?.target || ""}
                                                        onChange={(e) => setEditValues(prev => prev ? { ...prev, target: e.target.value } : null)}
                                                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                        placeholder="https://example.com"
                                                    />
                                                ) : (
                                                    <a
                                                        href={link.target}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 hover:underline max-w-md truncate block text-sm"
                                                    >
                                                        {link.target}
                                                    </a>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                                    {link.clicks.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex gap-2">
                                                    {editingSlug === link.slug ? (
                                                        <>
                                                            <button
                                                                onClick={handleSaveEdit}
                                                                className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                                                            >
                                                                Save
                                                            </button>
                                                            <button
                                                                onClick={handleCancelEdit}
                                                                className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => handleStartEdit(link)}
                                                                className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleIndividualDelete(link.slug)}
                                                                disabled={isDeleting}
                                                                className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {isDeleting ? "Deleting..." : "Delete"}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <footer className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    <p>
                        {filteredLinks.length > 0 &&
                            `Showing ${filteredLinks.length} of ${links.length} link${links.length === 1 ? "" : "s"
                            }`}
                    </p>
                </footer>
            </div>
        </div>
    );
}
