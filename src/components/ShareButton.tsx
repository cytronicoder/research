"use client";

import { Check, Copy, Facebook, Linkedin, Share2, Twitter } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface ShareButtonProps {
    title: string;
    shortUrl: string;
}

let globalOpenPopup: (() => void) | null = null;

export default function ShareButton({ title, shortUrl }: ShareButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${shortUrl}` : shortUrl;

    const closePopup = () => {
        setIsOpen(false);
        globalOpenPopup = null;
    };

    const openPopup = () => {
        if (globalOpenPopup) {
            globalOpenPopup();
        }
        setIsOpen(true);
        globalOpenPopup = closePopup;
    };

    const togglePopup = () => {
        if (isOpen) {
            closePopup();
        } else {
            openPopup();
        }
    };

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

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (buttonRef.current && !buttonRef.current.contains(event.target as Node) && isOpen) {
                closePopup();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="relative">
            <motion.button
                ref={buttonRef}
                onClick={togglePopup}
                className="p-2 rounded-full transition-colors"
                style={{
                    backgroundColor: 'transparent',
                    cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <Share2 className="w-4 h-4" style={{ color: 'var(--text-color)', opacity: 0.7 }} />
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: -10 }}
                        className="absolute right-0 top-full mt-2 rounded-lg shadow-lg p-2 z-10 min-w-40"
                        style={{
                            backgroundColor: 'var(--card-bg)',
                            borderColor: 'var(--card-border)',
                            border: '1px solid',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                        }}
                    >
                        <motion.button
                            onClick={copyToClipboard}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors"
                            style={{
                                color: 'var(--text-color)',
                                backgroundColor: 'transparent',
                                cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {copied ? (
                                <Check className="w-4 h-4 text-green-500" />
                            ) : (
                                <Copy className="w-4 h-4" style={{ color: 'var(--text-color)' }} />
                            )}
                            {copied ? 'Copied!' : 'Copy Link'}
                        </motion.button>

                        <div className="border-t my-1" style={{ borderColor: 'var(--card-border)' }} />

                        <motion.button
                            onClick={shareToTwitter}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors"
                            style={{
                                color: 'var(--text-color)',
                                backgroundColor: 'transparent'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Twitter className="w-4 h-4" style={{ color: 'var(--text-color)' }} />
                            Twitter
                        </motion.button>

                        <motion.button
                            onClick={shareToLinkedIn}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors"
                            style={{
                                color: 'var(--text-color)',
                                backgroundColor: 'transparent',
                                cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Linkedin className="w-4 h-4" style={{ color: 'var(--text-color)' }} />
                            LinkedIn
                        </motion.button>

                        <motion.button
                            onClick={shareToFacebook}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors"
                            style={{
                                color: 'var(--text-color)',
                                backgroundColor: 'transparent',
                                cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Facebook className="w-4 h-4" style={{ color: 'var(--text-color)' }} />
                            Facebook
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
