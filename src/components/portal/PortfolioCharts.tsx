"use client";

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type {
  LegacyHolding as Holding,
  LegacyTotals as Totals,
  LegacyTypeSplit as TypeSplit,
} from "@/lib/portfolio-legacy-types";
import { formatINR, formatPct, instrumentLabel, computeReturnPct } from "@/lib/format";
import {
  instrumentColor,
  INVESTED_COLOR,
  CURRENT_COLOR,
  POSITIVE_COLOR,
  NEGATIVE_COLOR,
} from "@/lib/portfolio-constants";

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-5">
      <h3 className="text-sm font-semibold text-navy-800">{title}</h3>
      <div className="mt-4 h-64 w-full">{children}</div>
    </div>
  );
}

// 1) Invested vs Current — a single donut comparing the two totals.
function InvestedVsCurrent({ totals }: { totals: Totals }) {
  const data = [
    { name: "Invested", value: totals.invested, color: INVESTED_COLOR },
    { name: "Current", value: totals.current, color: CURRENT_COLOR },
  ];
  return (
    <ChartCard title="Invested vs Current Value">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number) => formatINR(v)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// 2) Current value split by instrument type.
function TypeSplitChart({ splits }: { splits: TypeSplit[] }) {
  const data = splits.map((s) => ({
    name: instrumentLabel(s.instrument_type),
    value: s.current,
    color: instrumentColor(s.instrument_type),
  }));
  return (
    <ChartCard title="Current Value by Instrument Type">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number) => formatINR(v)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// 3) Per-instrument return % — a horizontal bar, green/red by sign.
function ReturnByInstrument({ holdings }: { holdings: Holding[] }) {
  const data = holdings
    .map((h) => ({
      name: h.instrument_name,
      returnPct: Number(
        computeReturnPct(Number(h.invested_amount), Number(h.current_value)).toFixed(2)
      ),
    }))
    .sort((a, b) => b.returnPct - a.returnPct)
    .slice(0, 12);

  return (
    <ChartCard title="Return % by Holding">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickFormatter={(v) => `${v}%`} fontSize={11} />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            fontSize={11}
            tick={{ fill: "#334155" }}
          />
          <Tooltip formatter={(v: number) => formatPct(v)} />
          <Bar dataKey="returnPct" radius={[0, 4, 4, 0]}>
            {data.map((d) => (
              <Cell
                key={d.name}
                fill={d.returnPct >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function PortfolioCharts({
  totals,
  splits,
  holdings,
}: {
  totals: Totals;
  splits: TypeSplit[];
  holdings: Holding[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <InvestedVsCurrent totals={totals} />
      <TypeSplitChart splits={splits} />
      <div className="lg:col-span-2">
        <ReturnByInstrument holdings={holdings} />
      </div>
    </div>
  );
}
