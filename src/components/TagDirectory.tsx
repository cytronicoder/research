"use client";

import { motion } from "motion/react";
import { useEffect, useRef } from "react";

interface TagDirectoryProps {
    allTags: string[];
    selectedTag: string | null;
    onTagSelect: (tag: string | null) => void;
}

export default function TagDirectory({ allTags, selectedTag, onTagSelect }: TagDirectoryProps) {
    const uniqueTags = Array.from(new Set(allTags)).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (selectedTag && scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const selectedButton = container.querySelector(`[data-tag="${selectedTag}"]`) as HTMLElement;

            if (selectedButton) {
                const containerRect = container.getBoundingClientRect();
                const buttonRect = selectedButton.getBoundingClientRect();

                const containerCenter = containerRect.left + containerRect.width / 2;
                const buttonCenter = buttonRect.left + buttonRect.width / 2;

                const scrollLeft = container.scrollLeft + (buttonCenter - containerCenter);

                container.scrollTo({
                    left: scrollLeft,
                    behavior: 'smooth'
                });
            }
        }
    }, [selectedTag]);

    return (
        <div className="mb-6">
            <div ref={scrollContainerRef} className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <motion.button
                    onClick={() => onTagSelect(null)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors whitespace-nowrap ${selectedTag === null
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    All Tags
                </motion.button>
                {uniqueTags.map((tag) => (
                    <motion.button
                        key={tag}
                        data-tag={tag}
                        onClick={() => onTagSelect(selectedTag === tag ? null : tag)}
                        className={`px-3 py-1 text-sm rounded-full transition-colors whitespace-nowrap ${selectedTag === tag
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {tag}
                    </motion.button>
                ))}
            </div>
        </div>
    );
}