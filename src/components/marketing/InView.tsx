"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

// Generalised scroll trigger (the IndiaMap observer pattern): adds
// `activeClass` to the wrapper the first time it enters the viewport, then
// disconnects. CSS keyed off that class runs the actual animation. Falls back
// to active immediately when IntersectionObserver is unavailable or the user
// prefers reduced motion (the reduced-motion CSS shows the settled state).
export function InView({
  activeClass,
  threshold = 0.3,
  className,
  children,
}: {
  activeClass: string;
  threshold?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      setActive(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setActive(true);
            obs.disconnect();
          }
        });
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return (
    <div ref={ref} className={cn(className, active && activeClass)}>
      {children}
    </div>
  );
}
