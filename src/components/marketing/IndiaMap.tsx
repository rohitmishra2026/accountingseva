"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

// Stylised map of western India (the site has offices in Goa and Pune).
// Equirectangular projection: lon 66–80E, lat 7–25N onto a 420x540 viewBox
// (30px per degree), so x = (lon - 66) * 30 and y = (25 - lat) * 30.
// The coastline is simplified but geographically grounded: Kutch, the
// Saurashtra peninsula, both gulfs, then the Konkan and Malabar coasts down
// to Kanyakumari. The eastern interior fades out to read as a crop, the
// coastline draws itself in on scroll, and the office markers pulse.
//
// Key plotted points: Mumbai (206,178) · Pune (236,194) · Goa (235,285)

const COAST =
  "M120,0 L66,36 Q60,52 80,62 Q104,74 132,72 Q114,86 88,84 " +
  "Q92,96 108,102 Q130,118 150,129 Q172,122 186,104 Q194,92 201,87 " +
  "Q207,100 204,117 Q206,146 206,178 Q214,208 219,240 Q228,262 235,285 " +
  "Q250,326 265,364 Q278,390 293,413 Q302,432 308,452 Q312,468 318,483 " +
  "Q330,500 346,508 Q356,498 364,487 Q382,476 399,471 Q412,458 420,435";

const LAND = COAST + " L420,0 Z";

const OFFICES = [
  { name: "Pune", x: 236, y: 194 },
  { name: "Goa", x: 235, y: 285 },
];

export function IndiaMap() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setInView(true);
            obs.disconnect();
          }
        });
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("relative", inView && "map-in-view")}>
      {/* viewBox is a zoomed crop of the full 420x540 projection: the coast
          still bleeds off the edges, but the Goa-Pune corridor fills the
          frame. Geometry and markers are untouched. */}
      <svg
        viewBox="55 45 330 430"
        role="img"
        aria-label="Map of western India showing office locations in Pune and Goa"
        className="mx-auto h-auto w-full max-w-md"
      >
        <defs>
          {/* Fade the eastern (cropped) side of the landmass out. */}
          <linearGradient id="india-fade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0.55" stopColor="#fff" stopOpacity="1" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id="india-mask">
            <rect width="420" height="540" fill="url(#india-fade)" />
          </mask>
          {/* Navy gradient for the landmass: deep in the north-west, lifting
              toward the south-east, so the vector reads as one brand object
              on the white section. */}
          <linearGradient id="india-navy" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0b1e39" />
            <stop offset="55%" stopColor="#0f2748" />
            <stop offset="100%" stopColor="#3d5f92" />
          </linearGradient>
        </defs>

        <g mask="url(#india-mask)">
          {/* Landmass */}
          <path d={LAND} className="map-fill" fill="url(#india-navy)" />
          {/* Coastline, drawn in on scroll */}
          <path
            d={COAST}
            pathLength={1}
            className="coast-path"
            fill="none"
            stroke="#0f2748"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Pune–Goa connector */}
        <path
          d={`M${OFFICES[0].x},${OFFICES[0].y} L${OFFICES[1].x},${OFFICES[1].y}`}
          className="map-marker"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="1"
          strokeDasharray="3 4"
        />

        {/* Office markers */}
        {OFFICES.map((o) => (
          <g key={o.name} className="map-marker">
            <circle cx={o.x} cy={o.y} r="9" fill="#8ea5c9" opacity="0.5" className="marker-pulse" />
            <circle cx={o.x} cy={o.y} r="4.5" fill="#ffffff" />
            <circle cx={o.x} cy={o.y} r="4.5" fill="none" stroke="#8ea5c9" strokeWidth="1.5" />
            <text
              x={o.x + 16}
              y={o.y + 1}
              fill="#eef2f7"
              fontSize="15"
              fontWeight="600"
              dominantBaseline="middle"
            >
              {o.name}
            </text>
            <text
              x={o.x + 16}
              y={o.y + 17}
              fill="#8ea5c9"
              fontSize="10.5"
              letterSpacing="1.5"
              dominantBaseline="middle"
            >
              OFFICE
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
