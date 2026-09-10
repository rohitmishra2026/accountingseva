import { Inbox } from "lucide-react";
import { HAIRLINE, INK, MUTED, PANEL } from "@/lib/portfolio-constants";

export function EmptyState({
  title = "No data yet",
  message = "Data will appear after your first sync.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white px-6 py-16 text-center"
      style={{ borderColor: HAIRLINE }}
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full"
        style={{ backgroundColor: PANEL, color: MUTED }}
      >
        <Inbox className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-semibold" style={{ color: INK }}>
        {title}
      </h3>
      <p className="mt-1 max-w-sm text-sm" style={{ color: MUTED }}>
        {message}
      </p>
    </div>
  );
}
