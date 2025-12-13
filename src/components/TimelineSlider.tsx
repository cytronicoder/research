"use client";

import { useEffect, useState } from "react";

interface TimelineSliderProps {
    minYear: number;
    maxYear: number;
    startYear: number;
    endYear: number;
    onStartChange: (year: number) => void;
    onEndChange: (year: number) => void;
}

export default function TimelineSlider({
    minYear,
    maxYear,
    startYear,
    endYear,
    onStartChange,
    onEndChange,
}: TimelineSliderProps) {
    const [localStart, setLocalStart] = useState(startYear);
    const [localEnd, setLocalEnd] = useState(endYear);

    useEffect(() => {
        setLocalStart(startYear);
        setLocalEnd(endYear);
    }, [startYear, endYear]);

    const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStart = Number(e.target.value);
        if (newStart <= localEnd) {
            setLocalStart(newStart);
            onStartChange(newStart);
        }
    };

    const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newEnd = Number(e.target.value);
        if (newEnd >= localStart) {
            setLocalEnd(newEnd);
            onEndChange(newEnd);
        }
    };

    const percentStart = ((localStart - minYear) / (maxYear - minYear)) * 100;
    const percentEnd = ((localEnd - minYear) / (maxYear - minYear)) * 100;

    return (
        <div className="w-full max-w-2xl mx-auto px-4 py-6">
            <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-color)' }}>
                        Timeline Filter
                    </span>
                    <span className="text-sm" style={{ color: 'var(--text-color)', opacity: 0.7 }}>
                        {localStart} – {localEnd}
                    </span>
                </div>

                <div className="relative h-10 flex items-center">
                    <div
                        className="absolute h-1 w-full rounded-full"
                        style={{
                            backgroundColor: 'var(--card-border)',
                            opacity: 0.3,
                        }}
                    />

                    <div
                        className="absolute h-1 rounded-full"
                        style={{
                            backgroundColor: 'var(--primary-color)',
                            left: `${percentStart}%`,
                            right: `${100 - percentEnd}%`,
                        }}
                    />

                    <input
                        type="range"
                        min={minYear}
                        max={maxYear}
                        value={localStart}
                        onChange={handleStartChange}
                        className="absolute w-full h-full opacity-0 cursor-pointer z-10 pointer-events-auto"
                        style={{ pointerEvents: 'auto' }}
                    />

                    <input
                        type="range"
                        min={minYear}
                        max={maxYear}
                        value={localEnd}
                        onChange={handleEndChange}
                        className="absolute w-full h-full opacity-0 cursor-pointer z-10 pointer-events-auto"
                        style={{ pointerEvents: 'auto' }}
                    />

                    <div
                        className="absolute w-5 h-5 rounded-full shadow-md z-9 pointer-events-none -translate-x-1/2 -translate-y-1/2 top-1/2"
                        style={{
                            left: `${percentStart}%`,
                            backgroundColor: 'var(--primary-color)',
                            border: '2px solid white',
                        }}
                    />
                    <div
                        className="absolute w-5 h-5 rounded-full shadow-md z-9 pointer-events-none -translate-x-1/2 -translate-y-1/2 top-1/2"
                        style={{
                            left: `${percentEnd}%`,
                            backgroundColor: 'var(--primary-color)',
                            border: '2px solid white',
                        }}
                    />
                </div>
            </div>

            <div className="flex gap-2 justify-center flex-wrap">
                <button
                    onClick={() => {
                        setLocalStart(minYear);
                        setLocalEnd(maxYear);
                        onStartChange(minYear);
                        onEndChange(maxYear);
                    }}
                    className="px-3 py-1 text-sm rounded-md transition-colors"
                    style={{
                        backgroundColor: 'var(--card-bg)',
                        borderColor: 'var(--card-border)',
                        border: '1px solid',
                        color: 'var(--text-color)',
                    }}
                >
                    Reset
                </button>
            </div>
        </div>
    );
}
