"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import type { LegacyHolding as Holding } from "@/lib/portfolio-legacy-types";
import { formatINR, formatPct, instrumentLabel, computeReturnPct } from "@/lib/format";
import { cn } from "@/lib/cn";

type Row = {
  name: string;
  type: string;
  invested: number;
  current: number;
  gainLoss: number;
  returnPct: number;
};

type SortKey = keyof Row;

function toRows(holdings: Holding[]): Row[] {
  return holdings.map((h) => {
    const invested = Number(h.invested_amount);
    const current = Number(h.current_value);
    return {
      name: h.instrument_name,
      type: h.instrument_type,
      invested,
      current,
      gainLoss: current - invested,
      returnPct: computeReturnPct(invested, current),
    };
  });
}

export function HoldingsTable({ holdings }: { holdings: Holding[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("current");
  const [asc, setAsc] = useState(false);

  const rows = useMemo(() => {
    const r = toRows(holdings);
    r.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return asc ? cmp : -cmp;
    });
    return r;
  }, [holdings, sortKey, asc]);

  function sortBy(key: SortKey) {
    if (key === sortKey) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(false);
    }
  }

  const columns: { key: SortKey; label: string; numeric?: boolean }[] = [
    { key: "name", label: "Instrument" },
    { key: "type", label: "Type" },
    { key: "invested", label: "Invested", numeric: true },
    { key: "current", label: "Current", numeric: true },
    { key: "gainLoss", label: "Gain / Loss", numeric: true },
    { key: "returnPct", label: "Return %", numeric: true },
  ];

  return (
    <div className="rounded-2xl border border-navy-100 bg-white">
      <div className="border-b border-navy-100 px-5 py-4">
        <h3 className="text-sm font-semibold text-navy-800">Holdings</h3>
      </div>

      {/* Desktop / tablet: table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-100 text-left text-navy-500">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn("px-5 py-3 font-medium", c.numeric && "text-right")}
                >
                  <button
                    type="button"
                    onClick={() => sortBy(c.key)}
                    className={cn(
                      "inline-flex items-center gap-1 hover:text-navy-900",
                      c.numeric && "flex-row-reverse"
                    )}
                    aria-label={`Sort by ${c.label}`}
                  >
                    {c.label}
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.name}-${i}`} className="border-b border-navy-50 last:border-0">
                <td className="px-5 py-3 font-medium text-navy-900">{r.name}</td>
                <td className="px-5 py-3 text-navy-600">{instrumentLabel(r.type)}</td>
                <td className="px-5 py-3 text-right tabular-nums text-navy-700">
                  {formatINR(r.invested)}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-navy-900">
                  {formatINR(r.current)}
                </td>
                <td
                  className={cn(
                    "px-5 py-3 text-right tabular-nums",
                    r.gainLoss >= 0 ? "text-emerald-600" : "text-red-600"
                  )}
                >
                  {formatINR(r.gainLoss)}
                </td>
                <td
                  className={cn(
                    "px-5 py-3 text-right font-medium tabular-nums",
                    r.returnPct >= 0 ? "text-emerald-600" : "text-red-600"
                  )}
                >
                  {formatPct(r.returnPct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <ul className="divide-y divide-navy-50 sm:hidden">
        {rows.map((r, i) => (
          <li key={`${r.name}-${i}`} className="px-5 py-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-navy-900">{r.name}</span>
              <span
                className={cn(
                  "text-sm font-medium tabular-nums",
                  r.returnPct >= 0 ? "text-emerald-600" : "text-red-600"
                )}
              >
                {formatPct(r.returnPct)}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-navy-500">{instrumentLabel(r.type)}</p>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div>
                <dt className="text-navy-400">Invested</dt>
                <dd className="tabular-nums text-navy-700">{formatINR(r.invested)}</dd>
              </div>
              <div>
                <dt className="text-navy-400">Current</dt>
                <dd className="tabular-nums text-navy-900">{formatINR(r.current)}</dd>
              </div>
              <div>
                <dt className="text-navy-400">Gain / Loss</dt>
                <dd
                  className={cn(
                    "tabular-nums",
                    r.gainLoss >= 0 ? "text-emerald-600" : "text-red-600"
                  )}
                >
                  {formatINR(r.gainLoss)}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
