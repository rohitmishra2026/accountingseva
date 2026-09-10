"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { aboutPhotos } from "@/content/marketing";

// Three-photo carousel for the About section: left/right arrows plus dots.
// Slides move as one strip via translateX so the transition is a smooth
// slide; photos are plain <img> so swapping the files in public/images is all
// the firm needs to do to go live with real pictures.
export function AboutCarousel() {
  const [index, setIndex] = useState(0);
  const count = aboutPhotos.length;

  const go = (dir: -1 | 1) => setIndex((i) => (i + dir + count) % count);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10">
      <div
        className="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {aboutPhotos.map((photo) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={photo.src}
            src={photo.src}
            alt={photo.alt}
            className="aspect-[4/3] w-full flex-shrink-0 object-cover"
          />
        ))}
      </div>

      <button
        type="button"
        aria-label="Previous photo"
        onClick={() => go(-1)}
        className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-navy-900 shadow-md transition-all hover:bg-white active:scale-95"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label="Next photo"
        onClick={() => go(1)}
        className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-navy-900 shadow-md transition-all hover:bg-white active:scale-95"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
        {aboutPhotos.map((photo, i) => (
          <button
            key={photo.src}
            type="button"
            aria-label={`Go to photo ${i + 1}`}
            aria-current={i === index}
            onClick={() => setIndex(i)}
            className={
              i === index
                ? "h-2 w-6 rounded-full bg-white transition-all"
                : "h-2 w-2 rounded-full bg-white/50 transition-all hover:bg-white/80"
            }
          />
        ))}
      </div>
    </div>
  );
}
