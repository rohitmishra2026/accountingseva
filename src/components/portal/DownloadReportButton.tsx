"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

// Fetches the server-generated PDF as a blob and triggers a download. Kept as a
// fetch (rather than a plain link) so we can show progress and surface errors
// without navigating away from the dashboard.
export function DownloadReportButton({ disabled }: { disabled?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/report", { method: "GET" });
      if (!res.ok) throw new Error(`Report failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "accountingseva-portfolio-report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Could not generate the report. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleDownload}
        disabled={disabled || loading}
        className="inline-flex items-center gap-2 rounded-full bg-navy-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {loading ? "Preparing…" : "Download PDF Report"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
