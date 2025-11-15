"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Share2, Copy, Check, Twitter, Linkedin, Facebook } from "lucide-react";

interface ShareButtonProps {
    title: string;
    shortUrl: string;
}

export default function ShareButton({ title, shortUrl }: ShareButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${shortUrl}` : shortUrl;

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(fullUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    };

    const shareToTwitter = () => {
        const text = `Check out "${title}": ${fullUrl}`;
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    const shareToLinkedIn = () => {
        const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(fullUrl)}`;
        window.open(url, '_blank');
    };

    const shareToFacebook = () => {
        const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`;
        window.open(url, '_blank');
    };

    return (
        <div className="relative">
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <Share2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: -10 }}
                        className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 z-10 min-w-40"
                    >
                        <motion.button
                            onClick={copyToClipboard}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {copied ? (
                                <Check className="w-4 h-4 text-green-500" />
                            ) : (
                                <Copy className="w-4 h-4" />
                            )}
                            {copied ? 'Copied!' : 'Copy Link'}
                        </motion.button>

                        <div className="border-t border-gray-200 dark:border-gray-600 my-1" />

                        <motion.button
                            onClick={shareToTwitter}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Twitter className="w-4 h-4" />
                            Twitter
                        </motion.button>

                        <motion.button
                            onClick={shareToLinkedIn}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Linkedin className="w-4 h-4" />
                            LinkedIn
                        </motion.button>

                        <motion.button
                            onClick={shareToFacebook}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Facebook className="w-4 h-4" />
                            Facebook
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
