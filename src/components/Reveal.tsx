"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

// Fade-up on scroll with optional stagger. Intentionally lightweight — no
// animation library. `delayMs` staggers the entrance (used by card grids for
// a cascading reveal); the delay is cleared once the entrance finishes so it
// never slows down hover transitions on the same element. Falls back to
// visible immediately if IntersectionObserver is unavailable or the user
// prefers reduced motion.
export function Reveal({
  children,
  className,
  as: Tag = "div",
  delayMs = 0,
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "li";
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Guarded: matchMedia is absent in jsdom and some embedded webviews, and
    // an entrance animation must never be the thing that breaks a page.
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      setShown(true);
      setSettled(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true);
            obs.disconnect();
          }
        });
      },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Drop the transition delay once the entrance animation has played out.
  useEffect(() => {
    if (!shown || settled) return;
    const t = setTimeout(() => setSettled(true), delayMs + 700);
    return () => clearTimeout(t);
  }, [shown, settled, delayMs]);

  const Comp = Tag as React.ElementType;
  return (
    <Comp
      ref={ref}
      style={!settled && delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
      className={cn(
        "transition-all duration-700 ease-out",
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
        className
      )}
    >
      {children}
    </Comp>
  );
}
