"use client";

import Image from "next/image";
import ThemeToggle from "./ThemeToggle";

interface SearchBarProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    resultsCount?: number;
}

export default function SearchBar({
    searchQuery,
    onSearchChange,
    resultsCount,
}: SearchBarProps) {
    return (
        <header className="mb-6 relative">
            <div className="absolute pointer-events-none z-10" style={{ top: '-60px', right: '60px' }}>
                <Image
                    src="/pet.png"
                    alt="Pet"
                    width={60}
                    height={60}
                    className="drop-shadow-sm"
                    style={{
                        filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.5)) drop-shadow(0 0 16px rgba(255, 255, 255, 0.25))'
                    }}
                />
            </div>
            <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg
                            className="h-5 w-5"
                            style={{ color: 'var(--text-color)', opacity: 0.5 }}
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
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 text-lg border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                        style={{
                            backgroundColor: 'var(--input-bg)',
                            borderColor: 'var(--input-border)',
                            color: 'var(--text-color)',
                            '--tw-ring-color': 'var(--primary-color)'
                        } as React.CSSProperties}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => onSearchChange("")}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center hover:opacity-100 transition-opacity"
                            style={{ color: 'var(--text-color)', opacity: 0.5 }}
                            aria-label="Clear search"
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
                <ThemeToggle />
            </div>
            {searchQuery && resultsCount !== undefined && (
                <p className="mt-3 text-sm" style={{ color: 'var(--text-color)', opacity: 0.7 }}>
                    {resultsCount} result{resultsCount === 1 ? "" : "s"} found
                </p>
            )}
        </header>
    );
}
