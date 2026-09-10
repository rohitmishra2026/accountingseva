import "server-only";

import { google } from "googleapis";
import { getGoogleServiceAccount } from "@/lib/env";
import type { RawRows, SheetTabs } from "./types";

// Thin I/O layer: reads the four tabs and hands back raw rows. All validation
// and normalisation happens in validate.ts / parse.ts so this stays dumb.
//
// Ranges start at row 1 (NOT row 2) because columns are located by header name
// rather than by index. That is what lets the sync survive the Holdings tab's
// column A being headed "a" instead of "Email", and lets Rohit sir reorder
// columns without anyone touching code.
const RANGES = {
  clients: "Clients!A1:Z",
  holdings: "Holdings!A1:Z",
  monthlyReturns: "'Monthly Returns'!A1:Z",
  categories: "Categories!A1:Z",
} as const;

export type ReadResult = {
  tabs: SheetTabs;
  /** Tabs the API could not return at all (missing, renamed, no permission). */
  unreadable: string[];
};

export async function readSheetTabs(): Promise<ReadResult> {
  const { email, privateKey, sheetId } = getGoogleServiceAccount();

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: sheetId,
    ranges: [
      RANGES.clients,
      RANGES.holdings,
      RANGES.monthlyReturns,
      RANGES.categories,
    ],
    // UNFORMATTED_VALUE keeps amounts as numbers and percentages as fractions
    // instead of locale-formatted strings. Dates arrive as serials, which
    // normaliseMonth() handles. parse.ts accepts every shape either way.
    valueRenderOption: "UNFORMATTED_VALUE",
    dateTimeRenderOption: "SERIAL_NUMBER",
  });

  const ranges = res.data.valueRanges ?? [];
  const unreadable: string[] = [];

  const pick = (index: number, label: string): RawRows => {
    const vr = ranges[index];
    if (!vr) {
      unreadable.push(label);
      return [];
    }
    return (vr.values ?? []) as RawRows;
  };

  return {
    tabs: {
      clients: pick(0, "Clients"),
      holdings: pick(1, "Holdings"),
      monthlyReturns: pick(2, "Monthly Returns"),
      categories: pick(3, "Categories"),
    },
    unreadable,
  };
}
