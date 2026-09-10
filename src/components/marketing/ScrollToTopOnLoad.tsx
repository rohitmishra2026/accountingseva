"use client";

import { useEffect } from "react";

// Belt-and-braces companion to the parse-time inline script in the marketing
// layout (which strips any #anchor and disables scroll restoration before
// the browser or router can act on them): on mount, make sure the page sits
// at the top, jumping instantly rather than smooth-scrolling. Mount-only, so
// in-page anchor clicks afterwards behave normally. Renders nothing.
export function ScrollToTopOnLoad() {
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    root.style.scrollBehavior = prev;
  }, []);

  return null;
}
