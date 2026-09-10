"use client";

import { useMemo, useState } from "react";
import type { LegacyTransaction as Transaction } from "@/lib/portfolio-legacy-types";
import { formatINR, formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

const TYPES = ["all", "buy", "sell", "dividend", "interest"] as const;
type Filter = (typeof TYPES)[number];
const PAGE_SIZE = 10;

const TYPE_BADGE: Record<string, string> = {
  buy: "bg-navy-50 text-navy-700",
  sell: "bg-amber-50 text-amber-700",
  dividend: "bg-emerald-50 text-emerald-700",
  interest: "bg-sky-50 text-sky-700",
};

export function TransactionsTable({ transactions }: { transactions: Transaction[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const list =
      filter === "all"
        ? transactions
        : transactions.filter((t) => t.txn_type === filter);
    return list;
  }, [transactions, filter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  function changeFilter(f: Filter) {
    setFilter(f);
    setPage(0);
  }

  return (
    <div className="rounded-2xl border border-navy-100 bg-white">
      <div className="flex flex-col gap-3 border-b border-navy-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-navy-800">Transactions</h3>
        <div className="flex flex-wrap gap-1.5">
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => changeFilter(t)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                filter === t
                  ? "bg-navy-700 text-white"
                  : "bg-navy-50 text-navy-600 hover:bg-navy-100"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-navy-500">
          No transactions to show.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-left text-navy-500">
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Instrument</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((t) => (
                  <tr key={t.id} className="border-b border-navy-50 last:border-0">
                    <td className="whitespace-nowrap px-5 py-3 text-navy-600">
                      {formatDate(t.txn_date)}
                    </td>
                    <td className="px-5 py-3 font-medium text-navy-900">
                      {t.instrument_name}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                          TYPE_BADGE[t.txn_type] ?? "bg-navy-50 text-navy-700"
                        )}
                      >
                        {t.txn_type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-navy-900">
                      {formatINR(Number(t.amount), { symbol: true, decimals: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-5 py-3 text-xs text-navy-500">
            <span>
              Page {safePage + 1} of {pageCount} · {filtered.length} transaction
              {filtered.length === 1 ? "" : "s"}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
                className="rounded-lg border border-navy-200 px-3 py-1 font-medium text-navy-700 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={safePage >= pageCount - 1}
                className="rounded-lg border border-navy-200 px-3 py-1 font-medium text-navy-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
