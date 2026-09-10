"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Lightweight count-up number. Animates 0 -> target with ease-out once the
// element scrolls into view, using requestAnimationFrame. No libraries.
// Re-runs whenever `target` or `replayKey` changes (used by the FY toggle).
// Respects prefers-reduced-motion by snapping straight to the target.
//
// Shared by the marketing site and the client portal, which is why it lives
// here rather than under components/marketing.
//
// A NEGATIVE target counts down from zero, because the interpolation is
// `eased * target` rather than an absolute ramp. That is exactly what a
// portfolio at a loss should do: start at nothing and fall to -8.00%.

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function CountUp({
  target,
  duration = 1800,
  prefix = "",
  suffix = "",
  replayKey = 0,
  className,
  format,
}: {
  target: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  replayKey?: number | string;
  className?: string;
  /**
   * Renders each intermediate value. Without it the number is rounded to a
   * whole and grouped en-IN, which is right for a count of filings and wrong
   * for a percentage: "+15.81%" would tick up to "+16". Portfolio figures pass
   * their own formatter so the decimals survive the animation.
   */
  format?: (value: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  // Seeded with the REAL figure, not zero.
  //
  // This is what the server renders and what survives if JavaScript never runs,
  // hydration fails, or requestAnimationFrame is throttled. Seeded at zero, a
  // portfolio statement would sit there reading "0.00%" and "₹0" - a wrong
  // number presented as a real one, which is far worse than no animation. The
  // count-up is an enhancement layered on top of a correct page.
  const [value, setValue] = useState(target);
  const [inView, setInView] = useState(false);

  // Drop to zero BEFORE the browser paints, so the figure does not flash its
  // final value and then restart. useLayoutEffect is client-only by
  // definition, which is exactly the gate wanted: no JS, no reset, real number.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Nothing to animate from if motion is unwanted or unobservable.
    if (reduce || typeof IntersectionObserver === "undefined") return;
    setValue(0);
  }, [target, replayKey]);

  // Observe visibility once; the animation effect below waits for it.
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
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    // matchMedia is absent in jsdom and in some embedded webviews. Treat a
    // missing implementation as "no preference expressed" rather than throwing
    // and taking the whole number down with it.
    const reduce =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setValue(target);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const v = easeOutCubic(t) * target;
      // Only round when there is no formatter: a formatter may well want the
      // fractional part, and rounding here would throw it away first.
      setValue(format ? v : Math.round(v));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, duration, replayKey, format]);

  // aria-label carries the FINAL value, so a screen reader announces the
  // figure once and correctly rather than narrating the interpolation.
  const render = (v: number) => (format ? format(v) : v.toLocaleString("en-IN"));

  return (
    <span
      ref={ref}
      className={className}
      aria-label={`${prefix}${render(target)}${suffix}`}
    >
      <span aria-hidden="true">
        {prefix}
        {render(value)}
        {suffix}
      </span>
    </span>
  );
}
