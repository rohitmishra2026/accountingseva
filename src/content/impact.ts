// "Our Impact" stats, split by financial year. Numbers animate on scroll.
//
// [PLACEHOLDER — replace every `value` below with the firm's real figures.]
// The values here are layout placeholders only. Each renders with a "+"
// suffix (e.g. 1200 -> "1,200+").

export type ImpactStat = {
  label: string;
  value: number;
};

export type FyStats = {
  fyKey: string; // short key used for the toggle, e.g. "FY 24-25"
  fyLabel: string; // full label shown above the stats
  stats: ImpactStat[];
};

export const impactByFy: FyStats[] = [
  {
    fyKey: "FY 24-25",
    fyLabel: "Financial Year 2024-25",
    stats: [
      // [PLACEHOLDER — real FY 24-25 figures]
      { label: "GST Returns Filed", value: 1200 },
      { label: "Salary ITRs Filed", value: 850 },
      { label: "Business ITRs Filed", value: 400 },
    ],
  },
  {
    fyKey: "FY 25-26",
    fyLabel: "Financial Year 2025-26 (ongoing)",
    stats: [
      // [PLACEHOLDER — real FY 25-26 figures]
      { label: "GST Returns Filed", value: 450 },
      { label: "Salary ITRs Filed", value: 320 },
      { label: "Business ITRs Filed", value: 150 },
    ],
  },
];

// Litigation content: powers the dedicated GST & Income Tax Litigation
// section.
// [PLACEHOLDER — confirm the case count with the firm.]
export const litigation = {
  caseCount: 200,
  intro:
    "Representation across GST, income tax and departmental proceedings, from replies to notices through assessments and appeals.",
  // What the practice handles, shown as the animated checklist.
  handles: [
    "GST notices and departmental queries",
    "Income tax notices and replies",
    "Assessment proceedings",
    "Appeals before appellate authorities",
    "Departmental representation and hearings",
  ],
};
