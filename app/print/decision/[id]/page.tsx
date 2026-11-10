import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDecisionById, getDocumentsForDecision } from "@/lib/decisions";
import {
  marginOfSafetyPct,
  OUTCOME_LABEL,
  semesterOf,
  STATUS_LABEL,
} from "@/lib/decision-types";
import { fileSize, longDate, money2, shares, signedPct } from "@/lib/format";
import { getStrategies, getUsers, getVotesForProposal } from "@/lib/store";
import { ThesisView } from "@/components/decisions/ThesisView";
import { PrintOnLoad } from "./PrintOnLoad";

// One decision as a plain document for printing or "Save as PDF": the thesis
// and the list of documents filed with it. Deliberately outside the app shell
// (no sidebar) and always black on white, whatever the app's theme.

export const metadata: Metadata = { title: "Decision · Eagle Fund" };

export default async function PrintDecisionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const d = /^[0-9a-f-]{36}$/i.test(id) ? await getDecisionById(id) : null;
  if (!d) notFound();

  const [documents, strategies, users, votes] = await Promise.all([
    getDocumentsForDecision(d.id),
    getStrategies(),
    getUsers(),
    d.proposalId ? getVotesForProposal(d.proposalId) : Promise.resolve([]),
  ]);
  const person = (userId: string | null) => users.find((u) => u.id === userId)?.name ?? "Unknown";
  const margin = marginOfSafetyPct(d.intrinsicValue, d.price);
  const voteLine = votes.length
    ? `${votes.filter((v) => v.vote === "in_favor").length} in favor, ${votes.filter((v) => v.vote === "against").length} against, ${votes.filter((v) => v.vote === "needs_review").length} needs review`
    : d.votesFor != null || d.votesAgainst != null || d.votesAbstain != null
      ? `${d.votesFor ?? 0} for, ${d.votesAgainst ?? 0} against, ${d.votesAbstain ?? 0} abstain`
      : null;

  const facts: [string, string | null][] = [
    ["Decision date", `${longDate(d.decisionDate)} (${semesterOf(d.decisionDate)})`],
    ["Status", STATUS_LABEL[d.status]],
    ["Strategy sleeve", strategies.find((s) => s.id === d.strategyId)?.name ?? null],
    ["Shares", d.shares == null ? null : shares(d.shares)],
    ["Price at decision", d.price == null ? null : money2(d.price)],
    ["Position size", d.positionPct == null ? null : `${d.positionPct}% of fund`],
    ["Analyst(s)", d.analysts],
    ["Vote result", voteLine],
    ["Valuation method", d.valuationMethod],
    ["Intrinsic value", d.intrinsicValue == null ? null : money2(d.intrinsicValue)],
    ["Price target", d.priceTarget == null ? null : money2(d.priceTarget)],
    ["Margin of safety", margin == null ? null : `${margin.toFixed(1)}%`],
  ];
  const reviewed = d.reviewOutcome || d.reviewNotes || d.reviewLessons || d.reviewedOn;

  return (
    <div className="min-h-screen bg-white text-neutral-900 [color-scheme:light]">
      <main className="mx-auto max-w-3xl px-8 py-10 print:px-0 print:py-0">
        <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
          <p className="text-sm text-neutral-600">This page is laid out for printing. Choose “Save as PDF” in the print dialog.</p>
          <PrintOnLoad />
        </div>

        <p className="text-xs uppercase tracking-widest text-neutral-500">Eagle Fund · Decision Log</p>
        <h1 className="mt-2 text-2xl font-semibold">
          {d.action === "buy" ? "Buy" : "Sell"} {d.ticker}
          {d.companyName ? <span className="font-normal text-neutral-600"> · {d.companyName}</span> : null}
        </h1>
        <p className="mt-3 text-base">{d.thesisSummary}</p>

        <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 border-y border-neutral-300 py-4 text-sm sm:grid-cols-3">
          {facts
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label}>
                <dt className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</dt>
                <dd className="mt-0.5">{value}</dd>
              </div>
            ))}
        </dl>

        <h2 className="mt-8 text-lg font-semibold">Thesis</h2>
        {d.thesis ? (
          <ThesisView doc={d.thesis} className="mt-3 !text-neutral-900" />
        ) : (
          <p className="mt-2 text-sm text-neutral-600">No thesis has been written.</p>
        )}

        {reviewed ? (
          <>
            <h2 className="mt-8 text-lg font-semibold">Review</h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-4">
              {(
                [
                  ["Thesis played out?", d.reviewOutcome ? OUTCOME_LABEL[d.reviewOutcome] : null],
                  ["Return since decision", d.reviewReturnPct == null ? null : signedPct(d.reviewReturnPct)],
                  ["Benchmark (80/20 ACWI/AGG)", d.reviewBenchmarkPct == null ? null : signedPct(d.reviewBenchmarkPct)],
                  ["Date reviewed", d.reviewedOn ? longDate(d.reviewedOn) : null],
                ] as const
              )
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</dt>
                    <dd className="mt-0.5">{value}</dd>
                  </div>
                ))}
            </dl>
            {d.reviewNotes ? <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{d.reviewNotes}</p> : null}
            {d.reviewLessons ? (
              <>
                <h3 className="mt-4 text-sm font-semibold">Lessons learned</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{d.reviewLessons}</p>
              </>
            ) : null}
          </>
        ) : null}

        <h2 className="mt-8 text-lg font-semibold">Documents on file</h2>
        {documents.length ? (
          <table className="mt-3 w-full text-left text-sm">
            <thead className="border-b border-neutral-300 text-[11px] uppercase tracking-wide text-neutral-500">
              <tr>
                <th scope="col" className="py-1.5 pr-4 font-medium">File</th>
                <th scope="col" className="py-1.5 pr-4 font-medium">Note</th>
                <th scope="col" className="py-1.5 pr-4 font-medium">Uploaded</th>
                <th scope="col" className="py-1.5 font-medium">Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td className="break-words py-1.5 pr-4">{doc.fileName}</td>
                  <td className="py-1.5 pr-4">{doc.note ?? ""}</td>
                  <td className="whitespace-nowrap py-1.5 pr-4">
                    {longDate(doc.createdAt.slice(0, 10))}, {person(doc.uploadedBy)}
                  </td>
                  <td className="whitespace-nowrap py-1.5">{fileSize(doc.sizeBytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-2 text-sm text-neutral-600">No documents are filed with this decision.</p>
        )}

        <p className="mt-10 border-t border-neutral-300 pt-3 text-xs text-neutral-500">
          Last edited by {person(d.updatedBy)} on {longDate(d.updatedAt.slice(0, 10))}. Exported from the Eagle Fund
          Tracker.
        </p>
      </main>
    </div>
  );
}
