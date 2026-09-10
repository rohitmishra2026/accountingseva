"use client";

import { useFormState } from "react-dom";
import { RefreshCw } from "lucide-react";
import { triggerSync, type SyncActionState } from "./actions";
import { SubmitButton } from "@/components/portal/SubmitButton";

const initial: SyncActionState = { ran: false };

export function RunSyncButton() {
  const [state, action] = useFormState(triggerSync, initial);

  return (
    <div className="space-y-3">
      <form action={action}>
        <div className="w-fit">
          <SubmitButton pendingText="Running sync…">
            <span className="inline-flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Run sync now
            </span>
          </SubmitButton>
        </div>
      </form>

      {state.ran && (
        <p
          role="status"
          className={
            state.ok
              ? "rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
              : "rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
          }
        >
          {state.message}
        </p>
      )}
    </div>
  );
}
