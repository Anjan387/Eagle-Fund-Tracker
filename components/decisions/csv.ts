import { marginOfSafetyPct, semesterOf, STATUS_LABEL, type Decision, type DecisionDocument } from "@/lib/decision-types";

// The whole log as one CSV file: a row per decision, a column per field.

const cell = (v: string | number | null | undefined) => {
  let s = v == null ? "" : String(v);
  // typed text that starts like a formula is given a leading apostrophe, so a
  // spreadsheet shows it as text instead of running it
  if (typeof v === "string" && /^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function decisionsToCsv(
  decisions: Decision[],
  documents: DecisionDocument[],
  strategyName: (id: string | null) => string,
  personName: (id: string | null) => string,
): string {
  const columns: [string, (d: Decision) => string | number | null][] = [
    ["Decision date", (d) => d.decisionDate],
    ["Semester", (d) => semesterOf(d.decisionDate)],
    ["Ticker", (d) => d.ticker],
    ["Company", (d) => d.companyName],
    ["Action", (d) => d.action.toUpperCase()],
    ["Status", (d) => STATUS_LABEL[d.status]],
    ["Sleeve", (d) => strategyName(d.strategyId)],
    ["Thesis summary", (d) => d.thesisSummary],
    ["Shares", (d) => d.shares],
    ["Price at decision", (d) => d.price],
    ["Position size %", (d) => d.positionPct],
    ["Analysts", (d) => d.analysts],
    ["Votes for", (d) => d.votesFor],
    ["Votes against", (d) => d.votesAgainst],
    ["Votes abstain", (d) => d.votesAbstain],
    ["Valuation method", (d) => d.valuationMethod],
    ["Intrinsic value", (d) => d.intrinsicValue],
    ["Price target", (d) => d.priceTarget],
    ["Margin of safety %", (d) => marginOfSafetyPct(d.intrinsicValue, d.price)?.toFixed(1) ?? null],
    ["Thesis", (d) => d.thesisText],
    ["Review outcome", (d) => d.reviewOutcome],
    ["Review notes", (d) => d.reviewNotes],
    ["Return since decision %", (d) => d.reviewReturnPct],
    ["Benchmark return %", (d) => d.reviewBenchmarkPct],
    ["Lessons learned", (d) => d.reviewLessons],
    ["Date reviewed", (d) => d.reviewedOn],
    [
      "Documents",
      (d) =>
        documents
          .filter((doc) => doc.decisionId === d.id)
          .map((doc) => doc.fileName)
          .join("; "),
    ],
    ["Linked decision id", (d) => d.relatedDecisionId],
    ["Linked proposal id", (d) => d.proposalId],
    ["Linked trade id", (d) => d.tradeId],
    ["Last edited by", (d) => personName(d.updatedBy)],
    ["Last edited at", (d) => d.updatedAt],
    ["Decision id", (d) => d.id],
  ];
  const rows = [columns.map(([name]) => cell(name)).join(",")];
  for (const d of decisions) rows.push(columns.map(([, get]) => cell(get(d))).join(","));
  return rows.join("\r\n");
}

export function downloadCsv(fileName: string, csv: string) {
  // the BOM makes Excel read the file as UTF-8
  const url = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
