"use client";

import { useMemo, useState } from "react";
import {
  Area,
  Brush,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyReturn, Totals } from "@/lib/portfolio-data";
import { formatCompactRupee, formatINR, formatMonthShort } from "@/lib/format";
import { cn } from "@/lib/cn";

const RANGES = [
  { key: "3M", months: 3 },
  { key: "6M", months: 6 },
  { key: "1Y", months: 12 },
  { key: "ALL", months: Infinity },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

// Portfolio value over time, in the shape of a trading chart: gradient area,
// crosshair readout, range pills and a draggable brush to zoom into any
// window. The value line is the invested base compounded by each month's
// actual return, so it reconciles with the headline figures rather than
// being a separate, invented series.
export function ValueChart({
  monthly,
  totals,
}: {
  monthly: MonthlyReturn[];
  totals: Totals;
}) {
  const [range, setRange] = useState<RangeKey>("ALL");

  const series = useMemo(() => {
    // Work backwards from today's value so the last point equals the real
    // current value, then walk the monthly returns back through time.
    let idx = 1;
    const factors = monthly.map((m) => {
      idx *= 1 + m.actualPct / 100;
      return idx;
    });
    const finalFactor = factors[factors.length - 1] || 1;
    const base = totals.current / finalFactor;

    return monthly.map((m, i) => ({
      // Months are stored as YYYY-MM; the chart axis reads Mon-YY.
      month: formatMonthShort(m.month),
      value: base * factors[i],
      invested: totals.invested,
      returnPct: m.actualPct,
    }));
  }, [monthly, totals]);

  const visible = useMemo(() => {
    const cfg = RANGES.find((r) => r.key === range)!;
    if (!Number.isFinite(cfg.months)) return series;
    return series.slice(Math.max(0, series.length - cfg.months));
  }, [series, range]);

  if (series.length === 0) return null;

  const first = visible[0];
  const last = visible[visible.length - 1];
  const change = last.value - first.value;
  const changePct = first.value > 0 ? (change / first.value) * 100 : 0;
  const up = change >= 0;
  const stroke = up ? "#2E7D32" : "#C0392B";

  const values = visible.map((d) => d.value);
  const min = Math.min(...values, totals.invested);
  const max = Math.max(...values, totals.invested);
  const pad = (max - min) * 0.12 || max * 0.05;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-2xl font-semibold tabular-nums text-navy-900 sm:text-3xl">
            {formatINR(last.value)}
          </p>
          <p
            className={cn(
              "mt-1 text-sm font-medium tabular-nums",
              up ? "text-[#2E7D32]" : "text-[#C0392B]"
            )}
          >
            {up ? "▲" : "▼"} {formatINR(Math.abs(change))} ({up ? "+" : "-"}
            {Math.abs(changePct).toFixed(2)}%)
            <span className="ml-2 font-normal text-navy-400">
              {first.month} to {last.month}
            </span>
          </p>
        </div>

        <div className="inline-flex rounded-full border border-navy-200 p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200",
                range === r.key
                  ? "bg-navy-900 text-white shadow-sm"
                  : "text-navy-500 hover:text-navy-900"
              )}
            >
              {r.key}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[340px] w-full sm:h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={visible}
            margin={{ top: 10, right: 12, left: 4, bottom: 0 }}
          >
            <defs>
              <linearGradient id="valueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid
              stroke="currentColor"
              className="text-navy-100"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "currentColor" }}
              className="text-navy-500"
              tickLine={false}
              axisLine={false}
              minTickGap={16}
            />
            <YAxis
              orientation="right"
              domain={[min - pad, max + pad]}
              tick={{ fontSize: 11, fill: "currentColor" }}
              className="text-navy-500"
              tickLine={false}
              axisLine={false}
              width={62}
              tickFormatter={formatCompactRupee}
            />
            <Tooltip
              cursor={{ stroke: "#94A3B8", strokeDasharray: "3 3" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as (typeof series)[number];
                return (
                  <div className="rounded-xl border border-navy-100 bg-white px-3 py-2 text-xs shadow-lg shadow-navy-900/10">
                    <p className="font-semibold text-navy-900">{label}</p>
                    <p className="mt-1 tabular-nums text-navy-700">
                      Value {formatINR(p.value)}
                    </p>
                    <p className="tabular-nums text-navy-500">
                      Month {p.returnPct >= 0 ? "+" : ""}
                      {p.returnPct.toFixed(2)}%
                    </p>
                  </div>
                );
              }}
            />

            <ReferenceLine
              y={totals.invested}
              stroke="#94A3B8"
              strokeDasharray="5 4"
              label={{
                value: "Invested",
                position: "insideTopLeft",
                fontSize: 10,
                fill: "#94A3B8",
              }}
            />

            <Area
              type="monotone"
              dataKey="value"
              stroke="none"
              fill="url(#valueFill)"
              animationDuration={900}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={stroke}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
              animationDuration={900}
            />

            {visible.length > 4 && (
              <Brush
                dataKey="month"
                height={26}
                travellerWidth={8}
                stroke="#94A3B8"
                fill="transparent"
                tickFormatter={() => ""}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 text-xs text-navy-500">
        Month end values, built from your invested amount and each month&apos;s
        actual return. Drag the handles below the chart to zoom into a window.
      </p>
    </div>
  );
}
