"use client";

import React, { useEffect, useRef, useState } from "react";

type Slide = {
  src: string;
  alt?: string;
  caption?: string;
  date?: string;
};

export default function ConferenceCarousel({ slides, caption, hideCaption = false }: { slides: Slide[]; caption?: string; hideCaption?: boolean }) {
  const [index, setIndex] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [index]);

  useEffect(() => {
    startAutoPlay();
    return stopAutoPlay;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const startAutoPlay = () => {
    stopAutoPlay();
    intervalRef.current = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 5000);
  };

  const stopAutoPlay = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const prev = () => setIndex((i) => (i - 1 + slides.length) % slides.length);
  const next = () => setIndex((i) => (i + 1) % slides.length);

  return (
    <div
      ref={containerRef}
      className="w-full max-w-4xl mx-auto relative overflow-hidden rounded-lg shadow-lg mb-8"
      onMouseEnter={stopAutoPlay}
      onMouseLeave={startAutoPlay}
      aria-roledescription="carousel"
    >
      <div className="relative h-72 sm:h-80 md:h-96 bg-gray-100">
        {slides.map((slide, i) => (
          <img
            key={i}
            src={slide.src}
            alt={slide.alt || `slide-${i + 1}`}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
              i === index ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            loading="lazy"
          />
        ))}

        {/* Caption */}
        {!hideCaption && slides[index] && ( 
          <div className="absolute left-4 bottom-4 bg-black/60 text-white text-sm rounded px-3 py-1">
            <div>{slides[index].caption}</div>
          </div>
        )}

        {/* Optional overall caption/title below the carousel */}
        {caption && (
          <div className="absolute left-4 top-4 bg-black/40 text-white text-sm rounded px-3 py-1">
            {caption}
          </div>
        )}

        {/* Prev/Next buttons */}
        <button
          aria-label="Previous slide"
          onClick={prev}
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2"
        >
          ◀
        </button>
        <button
          aria-label="Next slide"
          onClick={next}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2"
        >
          ▶
        </button>

        {/* Dots */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-3 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`w-3 h-3 rounded-full ${i === index ? "bg-white" : "bg-white/60"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
