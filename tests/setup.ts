// jsdom gaps that recharts needs.
//
// ResponsiveContainer subscribes to ResizeObserver, which jsdom does not
// implement. The stub reports the size of the wrapper the test renders, so the
// chart lays out with real geometry instead of collapsing to 0x0 (a 0x0 chart
// renders no bars, which would make a "the bar renders" assertion pass or fail
// for the wrong reason).

const BOX = { width: 600, height: 300 };

class ResizeObserverStub implements ResizeObserver {
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element): void {
    const entry = {
      target,
      contentRect: { ...BOX, top: 0, left: 0, bottom: BOX.height, right: BOX.width, x: 0, y: 0 },
      borderBoxSize: [{ inlineSize: BOX.width, blockSize: BOX.height }],
      contentBoxSize: [{ inlineSize: BOX.width, blockSize: BOX.height }],
      devicePixelContentBoxSize: [{ inlineSize: BOX.width, blockSize: BOX.height }],
    } as unknown as ResizeObserverEntry;
    this.callback([entry], this);
  }

  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

// recharts measures via getBoundingClientRect, which jsdom always reports as 0.
//
// Guarded on Element existing: a test file that opts into the node environment
// (@vitest-environment node) has no DOM at all, and this setup file still runs
// for it. Without the guard the whole file throws before any test starts.
if (typeof Element !== "undefined") {
  const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;

  Element.prototype.getBoundingClientRect = function (this: Element): DOMRect {
    const rect = originalGetBoundingClientRect.call(this);
    if (rect.width === 0 && rect.height === 0) {
      return {
        ...rect,
        width: BOX.width,
        height: BOX.height,
        top: 0,
        left: 0,
        bottom: BOX.height,
        right: BOX.width,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      } as DOMRect;
    }
    return rect;
  };
}

// jsdom does not implement matchMedia. Components guard against it being
// absent, so this is not needed to keep them from throwing - it is here to
// make the suite REDUCED-MOTION by default.
//
// Charts animate their bars in from the baseline, and count-up figures start
// at zero. Both mean that, for the first few hundred milliseconds, the DOM
// holds intermediate values: a bar with height 0, a total reading ₹0. A test
// asserting geometry or figures synchronously after render would be reading
// the animation rather than the result, and would be flaky by construction.
//
// Under reduced motion every one of those paths renders its final state
// immediately, which is both deterministic and a real path that real users
// with the OS setting enabled take. A test that specifically wants the
// animated path can override window.matchMedia itself.
if (typeof window !== "undefined") {
  window.matchMedia = ((query: string) => ({
    matches: /prefers-reduced-motion/.test(query),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
