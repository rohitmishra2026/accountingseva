// Axis scales for the report charts.
//
// The previous implementation clamped every domain at zero
// (`niceTicks(Math.max(0, ...))` with `domain={[0, max]}`), which meant a
// negative value rendered as nothing at all: a category at a loss vanished from
// Return Contribution, and a negative month was clipped off the bottom of the
// growth chart. These scales span negatives.

export type Scale = {
  ticks: number[];
  /** [min, max], always inclusive of zero so the baseline is visible. */
  domain: [number, number];
};

/** Round a step to a readable 1 / 2 / 2.5 / 5 / 10 x power-of-ten value. */
function niceStep(rough: number): number {
  if (!Number.isFinite(rough) || rough <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  const mult = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return mult * mag;
}

/**
 * Build a signed axis spanning min..max, always including zero.
 *
 * Ticks land on round multiples of a nice step. The domain is expanded outward
 * to the nearest step so the extreme bar is never clipped, and zero is always
 * inside the domain so a loss reads as crossing the baseline rather than as an
 * absent bar.
 */
export function signedScale(
  values: number[],
  targetTicks = 5
): Scale {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return { ticks: [0, 1], domain: [0, 1] };

  // Zero is always in range: the baseline has to be on the chart.
  const rawMin = Math.min(0, ...finite);
  const rawMax = Math.max(0, ...finite);

  if (rawMin === 0 && rawMax === 0) return { ticks: [0, 1], domain: [0, 1] };

  const span = rawMax - rawMin;
  const step = niceStep(span / Math.max(1, targetTicks - 1));

  const min = Math.floor(rawMin / step) * step;
  const max = Math.ceil(rawMax / step) * step;

  const ticks: number[] = [];
  // Accumulate by index rather than by repeated addition, so a fractional step
  // cannot drift and produce 0.30000000000000004 style ticks.
  const count = Math.round((max - min) / step);
  for (let i = 0; i <= count; i++) {
    ticks.push(round(min + i * step));
  }

  return { ticks, domain: [round(min), round(max)] };
}

/** Trim binary-float noise without losing genuine precision. */
function round(v: number): number {
  return Number(v.toPrecision(12));
}

/** True when the scale actually extends below zero. Asserted in tests. */
export function spansBelowZero(scale: Scale): boolean {
  return scale.domain[0] < 0;
}
