"use client";

import { useEffect, useState } from "react";

/**
 * Whether the viewer has asked the system for reduced motion.
 *
 * CSS handles this on its own via `motion-reduce:` and the media query in
 * globals.css. Recharts does not: its animation is a prop, not a stylesheet, so
 * a chart would keep growing its bars for someone who has explicitly asked
 * their machine to stop moving things. This is how that prop gets an answer.
 *
 * Starts false so the server render and the first client render agree; the
 * effect corrects it before paint. It also subscribes, so toggling the setting
 * takes effect without a reload.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);

    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
