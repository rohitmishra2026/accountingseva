"use client";

import { useEffect, useRef, useState } from "react";
import { FileDown, Menu, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/cn";

// The portal's single control surface: sync and report download live behind
// one button so the header stays clean.
export function PortalMenu() {
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const syncNow = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setSyncedAt(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
      window.location.reload();
    }, 700);
  };

  const downloadReport = () => {
    window.open("/api/report", "_blank", "noopener");
    setOpen(false);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-navy-200 text-navy-700 transition-all duration-200 hover:border-navy-700 hover:bg-navy-900 hover:text-white active:scale-95"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <div
        className={cn(
          "absolute right-0 z-50 mt-2 w-[19rem] origin-top-right rounded-2xl border border-navy-100 bg-white p-2 shadow-xl shadow-navy-900/10 transition-all duration-200 ease-out",
          open
            ? "pointer-events-auto scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-95 opacity-0"
        )}
      >
        {/* Sync */}
        <button
          type="button"
          onClick={syncNow}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-navy-800 transition-colors hover:bg-navy-50"
        >
          <RefreshCw className={cn("h-4 w-4 text-navy-500", syncing && "animate-spin")} />
          <span className="flex-1">
            {syncing ? "Syncing…" : "Sync data"}
            {syncedAt && !syncing && (
              <span className="ml-1.5 text-xs text-navy-400">{syncedAt}</span>
            )}
          </span>
        </button>

        <div className="my-1.5 h-px bg-navy-100" />

        {/* Download report */}
        <button
          type="button"
          onClick={downloadReport}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-navy-800 transition-colors hover:bg-navy-50"
        >
          <FileDown className="h-4 w-4 text-navy-500" />
          <span className="flex-1">Download report</span>
          <span className="text-xs text-navy-400">PDF</span>
        </button>
      </div>
    </div>
  );
}
