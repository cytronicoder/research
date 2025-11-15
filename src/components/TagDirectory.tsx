"use client";

import { motion } from "motion/react";

interface TagDirectoryProps {
    allTags: string[];
    selectedTag: string | null;
    onTagSelect: (tag: string | null) => void;
}

export default function TagDirectory({ allTags, selectedTag, onTagSelect }: TagDirectoryProps) {
    const uniqueTags = Array.from(new Set(allTags)).sort();

    return (
        <div className="mb-6">
            <div className="flex flex-wrap gap-2">
                <motion.button
                    onClick={() => onTagSelect(null)}
                    className="px-3 py-1 text-sm rounded-full transition-colors"
                    style={{
                        backgroundColor: selectedTag === null ? 'var(--primary-color)' : 'var(--foreground)',
                        color: selectedTag === null ? 'white' : 'var(--background-color)'
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    All Tags
                </motion.button>
                {uniqueTags.map((tag) => (
                    <motion.button
                        key={tag}
                        onClick={() => onTagSelect(selectedTag === tag ? null : tag)}
                        className="px-3 py-1 text-sm rounded-full transition-colors"
                        style={{
                            backgroundColor: selectedTag === tag ? 'var(--primary-color)' : 'var(--foreground)',
                            color: selectedTag === tag ? 'white' : 'var(--background-color)'
                        }}
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