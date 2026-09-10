import {
  Circle,
  Document,
  G,
  Image,
  Line,
  Page,
  Path,
  Polyline,
  Rect,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";
import type {
  CategoryGroup,
  CategorySplit,
  Holding,
  MonthlyReturn,
  Totals,
} from "@/lib/portfolio-data";
import { signedScale } from "@/lib/chart-scale";
import {
  BRAND,
  CHART_GRID,
  FIGURE,
  GAIN,
  GAIN_ON_INK,
  HAIRLINE,
  INK,
  LOSS,
  LOSS_ON_INK,
  MUTED,
  MUTED_ON_INK,
  NEUTRAL_COLOR,
  PANEL,
  readableOn,
  SERIES_CURRENT,
  SERIES_INVESTED,
} from "@/lib/portfolio-constants";
import {
  formatAmount,
  formatMonthShort,
  formatSignedAmount,
  formatSignedAmountSpaced,
} from "@/lib/format";

/**
 * Split a category label into at most two lines for a chart axis.
 *
 * @react-pdf's Svg Text does not wrap, so long names like
 * "Commodities (Held Physically)" collide with their neighbours on a single
 * centred line. Breaks on a space near the middle; falls back to a hard cut
 * when there is no space to break on.
 */
function wrapLabel(label: string, maxChars: number): string[] {
  const text = String(label ?? "").trim();
  if (text.length <= maxChars) return [text];

  const mid = Math.floor(text.length / 2);
  let split = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== " ") continue;
    if (split === -1 || Math.abs(i - mid) < Math.abs(split - mid)) split = i;
  }

  if (split === -1) {
    return [text.slice(0, maxChars), text.slice(maxChars, maxChars * 2)];
  }
  return [text.slice(0, split), text.slice(split + 1, split + 1 + maxChars * 2)];
}

// The downloadable statement.
//
// This is the SAME design as the on-screen Standard view, not a separate print
// artefact: a client who reads the portal and then downloads the PDF should get
// the document they were just looking at. The palette, the navy stat rail, the
// allocation table and the holdings table all come across.
//
// Charts are drawn with @react-pdf's SVG primitives because recharts cannot run
// here; the fonts and logo are registered by the caller via lib/pdf-assets.
//
// Colours are imported from lib/portfolio-constants rather than restated, so
// the screen and the download cannot drift apart. Category colours still arrive
// from the Categories tab on each split/group.

/** navy-100. The category band inside the holdings table. */
const GROUP_BAND = "#dbe3ef";

/**
 * The rail's hairlines, as SOLID hex.
 *
 * On screen these are border-white/15 and border-white/10. @react-pdf does not
 * honour rgba() in a border colour - it silently fell back to the accent green,
 * so every stat rule and the meta divider printed mint on navy where the screen
 * showed a faint white line. These are the same two values composited over INK
 * by hand: white at 15% and at 12% over #08152a.
 */
const RAIL_RULE = "#2d384a";
const RAIL_DIVIDER = "#263144";

// A4 is 595.28pt wide; the page padding below leaves this much for content.
const CONTENT_W = 527;
/** The navy rail on the left, then the two chart panels filling the rest. */
const RAIL_W = 150;
const COL_GAP = 10;
const CHART_W = CONTENT_W - RAIL_W - COL_GAP;

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 34,
    paddingTop: 30,
    paddingBottom: 44,
    fontSize: 9,
    fontFamily: "Inter",
    color: INK,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: HAIRLINE,
    paddingBottom: 10,
  },
  title: { fontSize: 22, fontWeight: 600, color: INK, letterSpacing: -0.3 },
  metaLine: { fontSize: 9, color: MUTED, marginTop: 5 },
  metaStrong: { fontWeight: 600, color: INK },
  // Matches the on-screen header logo: a rounded badge, corners cut by the SVG
  // paths in RoundedLogo rather than by CSS, because @react-pdf clips
  // borderRadius geometrically and leaves visibly jagged corners.
  logoSlot: { width: 108, height: 50 },

  band: { flexDirection: "row", gap: COL_GAP, marginTop: 14 },

  // ── The navy rail ──
  rail: {
    width: RAIL_W,
    backgroundColor: INK,
    borderRadius: 10,
    padding: 14,
  },
  railEyebrow: {
    fontSize: 6.5,
    fontWeight: 600,
    color: MUTED_ON_INK,
    letterSpacing: 1,
  },
  railHeadline: { fontSize: 26, fontWeight: 600, marginTop: 8, letterSpacing: -0.5 },
  railSub: { fontSize: 6.5, color: "#5f7fae", marginTop: 5 },
  railStat: {
    borderLeftWidth: 1.5,
    borderLeftColor: RAIL_RULE,
    paddingLeft: 8,
    marginTop: 13,
  },
  railStatValue: { fontSize: 11, fontWeight: 600, color: "#ffffff" },
  railStatLabel: { fontSize: 6.5, color: MUTED_ON_INK, marginTop: 3 },
  railMeta: {
    marginTop: 14,
    paddingTop: 9,
    borderTopWidth: 0.5,
    borderTopColor: RAIL_DIVIDER,
  },
  railMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  railMetaLabel: { fontSize: 6.5, color: "#5f7fae" },
  railMetaValue: { fontSize: 6.5, fontWeight: 600, color: "#ffffff" },

  // ── Chart panels ──
  chartsCol: { width: CHART_W, gap: COL_GAP },
  chartCard: {
    backgroundColor: PANEL,
    borderRadius: 10,
    padding: 10,
  },
  chartHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  chartTitle: { fontSize: 9, fontWeight: 600, color: INK },
  legendRow: { flexDirection: "row", gap: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  legendSwatch: { width: 6, height: 6, borderRadius: 1 },
  legendText: { fontSize: 6.5, color: MUTED },
  chartNote: { fontSize: 6.5, color: MUTED },

  // ── Section headings above tables ──
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: INK,
    marginTop: 18,
    marginBottom: 6,
  },

  // ── Tables ──
  table: {
    borderWidth: 0.5,
    borderColor: HAIRLINE,
    borderRadius: 6,
    overflow: "hidden",
  },
  tHead: { flexDirection: "row", backgroundColor: INK, paddingVertical: 5 },
  th: {
    fontSize: 6.5,
    fontWeight: 600,
    color: MUTED_ON_INK,
    letterSpacing: 0.7,
  },
  tRow: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: HAIRLINE,
    paddingVertical: 4.5,
    // Wrapped names run to several lines; the numbers must stay on the first.
    alignItems: "flex-start",
  },
  tFoot: { flexDirection: "row", backgroundColor: INK, paddingVertical: 6 },
  tFootText: { fontSize: 8.5, fontWeight: 600, color: "#ffffff" },
  td: { fontSize: 8.5, color: FIGURE },
  tdName: { fontSize: 8.5, color: INK },

  // Category band inside the holdings table.
  groupRow: { flexDirection: "row", alignItems: "center", backgroundColor: GROUP_BAND, paddingVertical: 4 },
  groupText: { fontSize: 8.5, fontWeight: 600, color: INK },
  dot: { width: 4, height: 4, borderRadius: 2, marginRight: 4 },
  subRow: { paddingTop: 6, paddingBottom: 1, paddingLeft: 18 },
  subText: { fontSize: 6.5, fontWeight: 600, letterSpacing: 0.7 },

  // Allocation table columns.
  aCat: { width: "24%", paddingLeft: 8, paddingRight: 4 },
  aBar: { width: "17%", paddingRight: 8, justifyContent: "center" },
  aShare: { width: "9%", textAlign: "right", paddingRight: 4 },
  aInv: { width: "14%", textAlign: "right", paddingRight: 4 },
  aCur: { width: "14%", textAlign: "right", paddingRight: 4 },
  aRet: { width: "12%", textAlign: "right", paddingRight: 4 },
  aPct: { width: "10%", textAlign: "right", paddingRight: 8 },
  track: { height: 4, borderRadius: 2, backgroundColor: HAIRLINE },
  fill: { height: 4, borderRadius: 2 },

  // Holdings table columns. cName is deliberately the widest: long scheme names
  // must wrap rather than clip, and the report's own output truncated them
  // ("ICICI Pru Balanced Advantag").
  //
  // cPct is 9%, not the 6% it started at: "+30.0%" at 8.5pt needs about 36pt
  // and 6% of the content width is 32, so @react-pdf broke every percentage
  // across three lines ("+-", "30.0-", "%") and tripled the row height.
  cName: { width: "36%", paddingLeft: 8, paddingRight: 4 },
  cAlloc: { width: "10%", textAlign: "right", paddingRight: 4 },
  cInv: { width: "16%", textAlign: "right", paddingRight: 4 },
  cCur: { width: "16%", textAlign: "right", paddingRight: 4 },
  cRet: { width: "13%", textAlign: "right", paddingRight: 4 },
  cPct: { width: "9%", textAlign: "right", paddingRight: 8 },

  monthCard: {
    backgroundColor: PANEL,
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
  },
  monthNote: {
    fontSize: 6.5,
    color: MUTED,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: HAIRLINE,
  },

  footer: {
    position: "absolute",
    bottom: 22,
    left: 34,
    right: 34,
    borderTopWidth: 0.5,
    borderTopColor: HAIRLINE,
    paddingTop: 6,
    alignItems: "flex-end",
  },
  footerName: { fontSize: 8, fontWeight: 600, color: INK },
  footerSub: { fontSize: 7, color: MUTED, marginTop: 1 },
});

// These now delegate to the shared helpers rather than reimplementing them, so
// a figure cannot render differently on screen and in the downloaded statement.
//
// The old local versions diverged in two ways. Rounding: signed() did
// Math.abs(Math.round(n)), and JS rounds halves toward +Infinity, so a gainLoss
// of exactly -5606.5 printed as -5,606 here while the screen's
// formatSignedAmount rounds the magnitude and printed -5,607. A client
// comparing the RETURN column on screen against their PDF saw two different
// numbers for the same holding, on losses only. Non-finite input: Math.round(NaN)
// stringifies to the literal "NaN" and Infinity to "∞", both of which were
// printed straight into the firm-branded totals band; formatINR coerces those
// to 0.
//
// Kept as thin wrappers instead of replacing every call site, so this change
// touches behaviour and nothing else.
function fmt(n: number): string {
  return formatAmount(n);
}
function signed(n: number): string {
  return formatSignedAmount(n);
}
function compact(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e7) return `${(n / 1e7).toFixed(a >= 1e8 ? 0 : 1)}Cr`;
  if (a >= 1e5) return `${(n / 1e5).toFixed(a >= 1e6 ? 0 : 1)}L`;
  if (a >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(Math.round(n));
}
function niceMax(max: number, steps = 4): { max: number; ticks: number[] } {
  if (!Number.isFinite(max) || max <= 0) return { max: 1, ticks: [0, 1] };
  const raw = max / steps;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  // Keep tick values exact (do not round to integers, or fractional steps
  // like 0.2% collapse into 0 and 1).
  for (let i = 0; i * step <= top + step * 1e-6; i++) {
    ticks.push(Number((i * step).toFixed(6)));
  }
  return { max: top, ticks };
}

// The logo, clipped through an SVG rounded rect so the corner curves render
// as smooth Bezier segments rather than @react-pdf's aliased CSS clip. Also
// draws a hairline stroke on top of the clip so the corner rendering reads
// consistently across PDF viewers.
// Rounded logo badge. The four corner tiles are painted as filled quarter
// discs cut out of the page background, which is the only way to get smooth
// anti-aliased curves in @react-pdf: its CSS `borderRadius` + `overflow`
// clip is geometric and leaves jagged pixels at small sizes.
function RoundedLogo({
  href,
  width,
  height,
  radius,
}: {
  href: string;
  width: number;
  height: number;
  radius: number;
}) {
  const r = radius;
  const w = width;
  const h = height;
  // Each corner is the difference between a small square and an inscribed
  // quarter circle. Drawn as SVG paths so the curves are smooth.
  const cornerPaths = [
    // Top-left
    `M 0 0 H ${r} A ${r} ${r} 0 0 0 0 ${r} Z`,
    // Top-right
    `M ${w} 0 V ${r} A ${r} ${r} 0 0 0 ${w - r} 0 Z`,
    // Bottom-right
    `M ${w} ${h} H ${w - r} A ${r} ${r} 0 0 0 ${w} ${h - r} Z`,
    // Bottom-left
    `M 0 ${h} V ${h - r} A ${r} ${r} 0 0 0 ${r} ${h} Z`,
  ];
  return (
    <View style={{ width: w, height: h, position: "relative" }}>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf Image has no alt */}
      <Image src={href} style={{ width: w, height: h, objectFit: "cover" }} />
      <Svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        {cornerPaths.map((d, i) => (
          <Path key={i} d={d} fill="#ffffff" />
        ))}
      </Svg>
    </View>
  );
}

// Both category charts share a plot geometry, so they line up in the column.
const PLOT_W = CHART_W - 20; // panel padding
const PLOT_H = 118;
const PLOT_L = 34; // room for the y-axis labels
const PLOT_R = 6;
const PLOT_T = 12;
const PLOT_B = 26; // two lines of category label

// ── Grouped bar: invested vs current, one pair per category ───────────────
function InvestedVsCurrent({ splits }: { splits: CategorySplit[] }) {
  const x0 = PLOT_L;
  const x1 = PLOT_W - PLOT_R;
  const y0 = PLOT_T;
  const y1 = PLOT_H - PLOT_B;
  const { max, ticks } = niceMax(
    Math.max(1, ...splits.map((s) => Math.max(s.invested, s.current)))
  );
  const yOf = (v: number) => y1 - (v / max) * (y1 - y0);
  const bandW = (x1 - x0) / Math.max(1, splits.length);
  const barW = Math.min(12, bandW * 0.28);

  return (
    <View style={styles.chartCard} wrap={false}>
      <View style={styles.chartHead}>
        <Text style={styles.chartTitle}>Invested vs Current Value</Text>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: SERIES_INVESTED }]} />
            <Text style={styles.legendText}>Invested</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: SERIES_CURRENT }]} />
            <Text style={styles.legendText}>Current</Text>
          </View>
        </View>
      </View>
      <Svg width="100%" height={PLOT_H} viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}>
        {ticks.map((t) => (
          <G key={t}>
            <Line x1={x0} y1={yOf(t)} x2={x1} y2={yOf(t)} stroke={CHART_GRID} strokeWidth={0.5} />
            <Text x={x0 - 4} y={yOf(t) + 2.5} style={{ fontSize: 6, fill: MUTED }} textAnchor="end">
              {compact(t)}
            </Text>
          </G>
        ))}
        {splits.map((s, i) => {
          const bx = x0 + i * bandW + bandW / 2;
          const gap = 1.5;
          return (
            <G key={s.category}>
              <Rect
                x={bx - barW - gap / 2}
                y={yOf(s.invested)}
                width={barW}
                height={y1 - yOf(s.invested)}
                fill={SERIES_INVESTED}
              />
              <Rect
                x={bx + gap / 2}
                y={yOf(s.current)}
                width={barW}
                height={y1 - yOf(s.current)}
                fill={SERIES_CURRENT}
              />
              {wrapLabel(s.category, 16).map((line, li) => (
                <Text
                  key={li}
                  x={bx}
                  y={y1 + 9 + li * 7}
                  style={{ fontSize: 6, fill: MUTED }}
                  textAnchor="middle"
                >
                  {line}
                </Text>
              ))}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

// ── Return contribution: one bar per category, in that category's colour ──
function ReturnContribution({ splits }: { splits: CategorySplit[] }) {
  const x0 = PLOT_L;
  const x1 = PLOT_W - PLOT_R;
  const y0 = PLOT_T;
  const y1 = PLOT_H - PLOT_B;
  // Signed, matching the on-screen chart: clamping at zero would draw nothing
  // at all for a category at a loss.
  const scale = signedScale(splits.map((s) => s.gainLoss), 4);
  const [lo, hi] = scale.domain;
  const span = hi - lo || 1;
  const yOf = (v: number) => y1 - ((v - lo) / span) * (y1 - y0);
  const zeroY = yOf(0);
  const bandW = (x1 - x0) / Math.max(1, splits.length);
  const barW = Math.min(18, bandW * 0.42);

  return (
    <View style={styles.chartCard} wrap={false}>
      <View style={styles.chartHead}>
        <Text style={styles.chartTitle}>Return Contribution</Text>
        <Text style={styles.chartNote}>₹ gained per category</Text>
      </View>
      <Svg width="100%" height={PLOT_H} viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}>
        {scale.ticks.map((t) => (
          <G key={t}>
            <Line x1={x0} y1={yOf(t)} x2={x1} y2={yOf(t)} stroke={CHART_GRID} strokeWidth={0.5} />
            <Text x={x0 - 4} y={yOf(t) + 2.5} style={{ fontSize: 6, fill: MUTED }} textAnchor="end">
              {compact(t)}
            </Text>
          </G>
        ))}
        {splits.map((s, i) => {
          const bx = x0 + i * bandW + bandW / 2;
          const colour = s.color || NEUTRAL_COLOR;
          // A loss hangs below the zero line; a gain rises above it.
          const top = Math.min(yOf(s.gainLoss), zeroY);
          const h = Math.abs(yOf(s.gainLoss) - zeroY);
          const positive = s.gainLoss >= 0;
          return (
            <G key={s.category}>
              <Rect x={bx - barW / 2} y={top} width={barW} height={h} fill={colour} />
              {/* The bar keeps the client's exact category colour; the figure
                  printed on top of it is text, so it is darkened until it is
                  readable on the panel. */}
              <Text
                x={bx}
                y={positive ? top - 3 : top + h + 6}
                style={{ fontSize: 5.5, fill: readableOn(colour, PANEL) }}
                textAnchor="middle"
              >
                {signed(s.gainLoss)}
              </Text>
              {wrapLabel(s.category, 16).map((line, li) => (
                <Text
                  key={li}
                  x={bx}
                  y={y1 + 9 + li * 7}
                  style={{ fontSize: 6, fill: MUTED }}
                  textAnchor="middle"
                >
                  {line}
                </Text>
              ))}
            </G>
          );
        })}
        <Line x1={x0} y1={zeroY} x2={x1} y2={zeroY} stroke={HAIRLINE} strokeWidth={0.75} />
      </Svg>
    </View>
  );
}

// ── Month-on-month growth: actual (solid blue) vs expected (grey dashed) ──
function MonthlyGrowth({ monthly }: { monthly: MonthlyReturn[] }) {
  const W = CONTENT_W - 20; // panel padding
  const H = 200;
  const mL = 38;
  const mR = 10;
  const mT = 10;
  const mB = 34;
  const x0 = mL;
  const x1 = W - mR;
  const y0 = mT;
  const y1 = H - mB;
  // Signed scale, matching the on-screen chart in report/ReportCharts.tsx.
  //
  // This previously used niceMax(Math.max(0.1, ...values)), which clamped the
  // axis at zero. A losing month then plotted BELOW y1 and fell outside the
  // 250-unit viewBox entirely, so the blue line just stopped at the last
  // positive month. An all-negative series was worse: Math.max(0.1, ...) made
  // the axis read 0.0% to 0.1% and both series plotted thousands of units off
  // canvas, leaving a blank grid under a completely false axis.
  //
  // lib/chart-scale.ts documents this exact defect as fixed. The fix reached
  // the screen chart and never reached this one, so a client's downloaded
  // statement disagreed with what they saw in the portal.
  const scale = signedScale(
    monthly.flatMap((m) => [m.actualPct, m.expectedPct]),
    7
  );
  const [lo, hi] = scale.domain;
  const span = hi - lo || 1;
  const n = monthly.length;
  const xOf = (i: number) => x0 + (n === 1 ? (x1 - x0) / 2 : (i / (n - 1)) * (x1 - x0));
  const yOf = (v: number) => y1 - ((v - lo) / span) * (y1 - y0);
  const zeroY = yOf(0);
  const actual = monthly.map((m, i) => `${xOf(i)},${yOf(m.actualPct)}`).join(" ");
  const expected = monthly.map((m, i) => `${xOf(i)},${yOf(m.expectedPct)}`).join(" ");

  return (
    <View style={styles.monthCard} wrap={false}>
      <View style={styles.chartHead}>
        <Text style={styles.chartTitle}>Month-on-Month Growth Returns (%)</Text>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: BRAND }]} />
            <Text style={styles.legendText}>Actual</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: MUTED_ON_INK }]} />
            <Text style={styles.legendText}>Expected</Text>
          </View>
        </View>
      </View>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        {scale.ticks.map((t) => (
          <G key={t}>
            <Line x1={x0} y1={yOf(t)} x2={x1} y2={yOf(t)} stroke={CHART_GRID} strokeWidth={0.5} />
            <Text x={x0 - 5} y={yOf(t) + 3} style={{ fontSize: 6, fill: MUTED }} textAnchor="end">
              {`${t.toFixed(1)}%`}
            </Text>
          </G>
        ))}
        {monthly.map((m, i) => (
          <Text
            key={m.month}
            x={xOf(i)}
            y={y1 + 11}
            style={{ fontSize: 6, fill: MUTED }}
            textAnchor="middle"
          >
            {formatMonthShort(m.month)}
          </Text>
        ))}
        {/* Baseline at zero, not at the bottom of the plot. With a negative
            month in range these differ, and the line has to sit where 0% is
            for a loss to read as crossing it. */}
        <Line x1={x0} y1={zeroY} x2={x1} y2={zeroY} stroke={HAIRLINE} strokeWidth={0.75} />

        <Polyline points={expected} fill="none" stroke={MUTED_ON_INK} strokeWidth={1.5} strokeDasharray="5 4" />
        <Polyline points={actual} fill="none" stroke={BRAND} strokeWidth={2.5} />
        {monthly.map((m, i) => (
          <Circle key={`e${m.month}`} cx={xOf(i)} cy={yOf(m.expectedPct)} r={2.4} fill={MUTED_ON_INK} />
        ))}
        {monthly.map((m, i) => (
          <Circle key={`a${m.month}`} cx={xOf(i)} cy={yOf(m.actualPct)} r={2.8} fill={BRAND} />
        ))}
      </Svg>
      <Text style={styles.monthNote}>
        Actual monthly returns versus the expected benchmark.
      </Text>
    </View>
  );
}

// ── The navy rail: the report's headline figures ──────────────────────────
// The same object as the on-screen stat rail. Replaces the old four-cell grey
// totals band, which gave four numbers equal weight; here the return is the
// headline and the rupee figures support it.
//
// A loss takes the light red rather than the mint: on this navy the ordinary
// LOSS red is close to unreadable. The sign always comes from the value.
function StatRail({
  totals,
  splits,
  holdings,
  reportMonthLabel,
}: {
  totals: Totals;
  splits: CategorySplit[];
  holdings: Holding[];
  reportMonthLabel: string;
}) {
  const positive = totals.gainLoss >= 0;
  const tone = positive ? GAIN_ON_INK : LOSS_ON_INK;
  const top = topPerformer(holdings);

  return (
    <View style={styles.rail}>
      <Text style={styles.railEyebrow}>OVERALL RETURN</Text>
      <Text style={[styles.railHeadline, { color: tone }]}>
        {positive ? "+" : "-"}
        {Math.abs(totals.returnPct).toFixed(2)}%
      </Text>
      <Text style={styles.railSub}>
        Financial performance to {reportMonthLabel}
      </Text>

      <View style={styles.railStat}>
        <Text style={styles.railStatValue}>₹{fmt(totals.invested)}</Text>
        <Text style={styles.railStatLabel}>TOTAL INVESTED</Text>
      </View>
      <View style={styles.railStat}>
        <Text style={styles.railStatValue}>₹{fmt(totals.current)}</Text>
        <Text style={styles.railStatLabel}>TOTAL CURRENT VALUE</Text>
      </View>
      <View style={styles.railStat}>
        <Text style={[styles.railStatValue, { color: tone }]}>
          {positive ? "+" : "-"}₹{fmt(Math.abs(totals.gainLoss))}
        </Text>
        <Text style={styles.railStatLabel}>TOTAL APPRECIATION</Text>
      </View>

      {/* Grows to fill whatever height the charts column sets, which pins the
          meta block below to the foot of the rail. */}
      <View style={{ flexGrow: 1, minHeight: 10 }} />

      <View style={styles.railMeta}>
        <View style={styles.railMetaRow}>
          <Text style={styles.railMetaLabel}>Holdings</Text>
          <Text style={styles.railMetaValue}>{totals.count} instruments</Text>
        </View>
        <View style={styles.railMetaRow}>
          <Text style={styles.railMetaLabel}>Asset classes</Text>
          <Text style={styles.railMetaValue}>{splits.length}</Text>
        </View>
        {top && (
          <View style={{ marginTop: 2 }}>
            <Text style={styles.railMetaLabel}>Top performer</Text>
            <View style={[styles.railMetaRow, { marginTop: 2 }]}>
              <Text style={[styles.railMetaValue, { flex: 1, paddingRight: 4 }]}>
                {top.name}
              </Text>
              <Text
                style={[
                  styles.railMetaValue,
                  { color: top.returnPct >= 0 ? GAIN_ON_INK : LOSS_ON_INK },
                ]}
              >
                {top.returnPct >= 0 ? "+" : "-"}
                {Math.abs(top.returnPct).toFixed(1)}%
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

/**
 * The holding with the highest percentage return.
 *
 * Holdings with nothing invested are excluded: returnPct() defines their return
 * as 0, so including them would let a dormant zero-cost line outrank a real one
 * the moment every holding was at a loss.
 */
function topPerformer(
  holdings: Holding[]
): { name: string; returnPct: number } | null {
  let best: { name: string; returnPct: number } | null = null;
  for (const h of holdings) {
    const invested = Number(h.investedAmount);
    if (!(invested > 0)) continue;
    const pct = ((Number(h.currentValue) - invested) / invested) * 100;
    if (!best || pct > best.returnPct) {
      best = { name: h.investmentName, returnPct: pct };
    }
  }
  return best;
}

// ── Allocation by category ────────────────────────────────────────────────
// Share is measured on CURRENT value: "how much of what I have now is in this".
// The bar is scaled to the largest category rather than to 100%, so the
// differences between categories are legible instead of every bar being a stub.
function AllocationTable({
  splits,
  totals,
}: {
  splits: CategorySplit[];
  totals: Totals;
}) {
  if (splits.length === 0) return null;

  const denominator = totals.current > 0 ? totals.current : 0;
  const shareOf = (v: number) => (denominator ? (v / denominator) * 100 : 0);
  const maxShare = Math.max(...splits.map((s) => shareOf(s.current)), 0);
  const positive = totals.gainLoss >= 0;

  return (
    <View>
      <Text style={styles.sectionTitle}>Allocation by Category</Text>
      <View style={styles.table}>
        <View style={styles.tHead}>
          <Text style={[styles.th, styles.aCat]}>CATEGORY</Text>
          <Text style={[styles.th, styles.aBar]}>SHARE OF PORTFOLIO</Text>
          <Text style={[styles.th, styles.aShare]} />
          <Text style={[styles.th, styles.aInv]}>INVESTED</Text>
          <Text style={[styles.th, styles.aCur]}>CURRENT</Text>
          <Text style={[styles.th, styles.aRet]}>RETURN</Text>
          <Text style={[styles.th, styles.aPct]}>RET %</Text>
        </View>

        {splits.map((s) => {
          const share = shareOf(s.current);
          const col = s.gainLoss >= 0 ? GAIN : LOSS;
          const width = maxShare > 0 ? Math.max(4, (share / maxShare) * 100) : 0;
          return (
            <View key={s.category} style={styles.tRow} wrap={false}>
              <View style={[styles.aCat, { flexDirection: "row", alignItems: "center" }]}>
                <View style={[styles.dot, { backgroundColor: s.color || NEUTRAL_COLOR }]} />
                <Text style={styles.tdName}>{s.category}</Text>
              </View>
              <View style={styles.aBar}>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      { width: `${width}%`, backgroundColor: s.color || NEUTRAL_COLOR },
                    ]}
                  />
                </View>
              </View>
              <Text style={[styles.td, styles.aShare]}>{share.toFixed(1)}%</Text>
              <Text style={[styles.td, styles.aInv]}>{fmt(s.invested)}</Text>
              <Text style={[styles.td, styles.aCur]}>{fmt(s.current)}</Text>
              <Text style={[styles.td, styles.aRet, { color: col }]}>
                {signed(s.gainLoss)}
              </Text>
              <Text style={[styles.td, styles.aPct, { color: col }]}>
                {s.gainLoss >= 0 ? "+" : "-"}
                {Math.abs(s.returnPct).toFixed(1)}%
              </Text>
            </View>
          );
        })}

        <View style={styles.tFoot}>
          <Text style={[styles.tFootText, styles.aCat]}>Total</Text>
          <Text style={[styles.tFootText, styles.aBar]} />
          <Text style={[styles.tFootText, styles.aShare]}>100%</Text>
          <Text style={[styles.tFootText, styles.aInv]}>{fmt(totals.invested)}</Text>
          <Text style={[styles.tFootText, styles.aCur]}>{fmt(totals.current)}</Text>
          <Text
            style={[
              styles.tFootText,
              styles.aRet,
              { color: positive ? GAIN_ON_INK : LOSS_ON_INK },
            ]}
          >
            {signed(totals.gainLoss)}
          </Text>
          <Text
            style={[
              styles.tFootText,
              styles.aPct,
              { color: positive ? GAIN_ON_INK : LOSS_ON_INK },
            ]}
          >
            {positive ? "+" : "-"}
            {Math.abs(totals.returnPct).toFixed(1)}%
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Holdings table, grouped by category then sub-category ─────────────────
// Same tree as the on-screen table: category band, then indented sub-category
// grouping headers, then the holdings. No subtotal rows and no empty filler
// rows, matching the report.
//
// The CATEGORY column is gone, as on screen: it repeated the group header
// directly above it on every row. Nothing is lost - the grouping states the
// category and sub-categories state themselves - and the space goes to the
// names, which are what actually needed it.
function HoldingsTable({ groups }: { groups: CategoryGroup[] }) {
  if (groups.length === 0) return null;

  return (
    <View>
      <Text style={styles.sectionTitle}>Detailed Holdings</Text>
      <View style={styles.table}>
        <View style={styles.tHead}>
          <Text style={[styles.th, styles.cName]}>INVESTMENT NAME</Text>
          <Text style={[styles.th, styles.cAlloc]}>ALLOC %</Text>
          <Text style={[styles.th, styles.cInv]}>INVESTED (₹)</Text>
          <Text style={[styles.th, styles.cCur]}>CURRENT (₹)</Text>
          <Text style={[styles.th, styles.cRet]}>RETURN (₹)</Text>
          <Text style={[styles.th, styles.cPct]}>RET %</Text>
        </View>

        {groups.map((group) => {
          const colour = group.color || NEUTRAL_COLOR;
          // The sub-category caption is the category's own colour, darkened
          // only as far as it must be to stay legible on white. Derived,
          // because the colour arrives from the Sheet and can be anything.
          const accent = readableOn(colour, "#ffffff");
          return (
            <View key={group.category}>
              <View style={styles.groupRow}>
                <View style={[styles.dot, { backgroundColor: colour, marginLeft: 8 }]} />
                <Text style={styles.groupText}>{group.category}</Text>
              </View>

              {group.subGroups.map((sub) => (
                <View key={sub.subCategory ?? "__none__"}>
                  {sub.subCategory && (
                    <View style={styles.subRow}>
                      <Text style={[styles.subText, { color: accent }]}>
                        {sub.subCategory.toUpperCase()}
                      </Text>
                    </View>
                  )}

                  {sub.rows.map((r) => {
                    const positive = r.gainLoss >= 0;
                    const col = positive ? GAIN : LOSS;
                    return (
                      <View key={r.id} style={styles.tRow} wrap={false}>
                        <Text
                          style={[
                            styles.tdName,
                            styles.cName,
                            sub.subCategory ? { paddingLeft: 18 } : {},
                          ]}
                        >
                          {r.investmentName}
                        </Text>
                        <Text style={[styles.td, styles.cAlloc]}>
                          {r.allocPct.toFixed(1)}%
                        </Text>
                        <Text style={[styles.td, styles.cInv]}>
                          {fmt(r.investedAmount)}
                        </Text>
                        <Text style={[styles.td, styles.cCur]}>
                          {fmt(r.currentValue)}
                        </Text>
                        <Text style={[styles.td, styles.cRet, { color: col }]}>
                          {signed(r.gainLoss)}
                        </Text>
                        <Text style={[styles.td, styles.cPct, { color: col }]}>
                          {positive ? "+" : "-"}
                          {Math.abs(r.returnPct).toFixed(1)}%
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function PortfolioPdf({
  firmName,
  clientName,
  reportDateLine,
  reportMonthLabel,
  generatedLine,
  logoDataUri,
  totals,
  groups,
  splits,
  holdings,
  monthly,
}: {
  firmName: string;
  clientName: string;
  reportDateLine: string;
  /** Just the month, e.g. "July 2026", for the rail's sub-line. */
  reportMonthLabel: string;
  generatedLine: string;
  logoDataUri: string | null;
  totals: Totals;
  groups: CategoryGroup[];
  splits: CategorySplit[];
  holdings: Holding[];
  monthly: MonthlyReturn[];
}) {
  return (
    <Document title={`${firmName} Portfolio Summary`} author={firmName}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Portfolio Summary</Text>
            <Text style={styles.metaLine}>
              <Text style={styles.metaStrong}>{clientName}</Text>
              {"   |   "}
              {reportDateLine}
              {"   |   "}
              {generatedLine}
            </Text>
          </View>
          {logoDataUri && (
            <View style={styles.logoSlot}>
              <RoundedLogo href={logoDataUri} width={108} height={50} radius={8} />
            </View>
          )}
        </View>

        {/* The rail and the two charts read as one band, as on screen. */}
        <View style={styles.band}>
          <StatRail
            totals={totals}
            splits={splits}
            holdings={holdings}
            reportMonthLabel={reportMonthLabel}
          />
          <View style={styles.chartsCol}>
            <InvestedVsCurrent splits={splits} />
            <ReturnContribution splits={splits} />
          </View>
        </View>

        <AllocationTable splits={splits} totals={totals} />

        <HoldingsTable groups={groups} />

        {monthly.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Performance Trend</Text>
            <MonthlyGrowth monthly={monthly} />
          </View>
        )}

        {/* fixed: repeats on every page the holdings table spills onto. */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerName}>AccountingSeva</Text>
          <Text style={styles.footerSub}>Tax &amp; Compliance Professionals</Text>
        </View>
      </Page>
    </Document>
  );
}
