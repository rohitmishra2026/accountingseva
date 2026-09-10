import { Loader2 } from "lucide-react";

// Shown while the server component fetches portfolio data.
export default function PortalLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white text-slate-500">
      <Loader2 className="h-6 w-6 animate-spin" />
      <p className="text-sm">Loading your portfolio…</p>
    </div>
  );
}
