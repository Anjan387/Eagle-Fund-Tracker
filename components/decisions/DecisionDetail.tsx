"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { removeDecision, saveDecision } from "@/app/actions/decisions";
import { cn, EmptyState, FieldError, SubmitButton } from "@/components/ui";
import { longDate, money2, shares as formatShares, signedPct } from "@/lib/format";
import {
  marginOfSafetyPct,
  OUTCOME_LABEL,
  semesterOf,
  STATUS_LABEL,
  type Decision,
  type DecisionDocument,
} from "@/lib/decision-types";
import { ActionBadge, StatusBadge } from "./Badges";
import { DocumentsPanel } from "./DocumentsPanel";
import { BasicsFields, ReviewFields, ThesisFields, type FieldOptions } from "./Fields";
import { fromForm, missingRequired, toForm, type DecisionForm } from "./form";
import { TabBar } from "./Tabs";
import { ThesisView } from "./ThesisView";
import styles from "./decisions.module.css";

export interface VoteTally {
  inFavor: number;
  against: number;
  needsReview: number;
}

type Section = "overview" | "thesis" | "documents" | "review";

/** One decision's folder: Overview, Thesis, Documents and Review, with an edit mode. */
export function DecisionDetail({
  decision,
  documents,
  options,
  people,
  proposalVotes,
  me,
  onOpen,
  onDeleted,
  refresh,
}: {
  decision: Decision;
  documents: DecisionDocument[];
  options: FieldOptions;
  people: Record<string, string>;
  proposalVotes: Record<string, VoteTally>;
  me: { id: string; role: string };
  onOpen: (id: string) => void;
  onDeleted: (id: string) => void;
  refresh: () => void;
}) {
  const [section, setSection] = useState<Section>("overview");
  const [form, setForm] = useState<DecisionForm | null>(null); // non-null while editing
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelId = `decision-${decision.id}-panel`;
  const editing = form !== null;

  async function save() {
    if (!form) return;
    const missing = missingRequired(form);
    if (missing) return setError(missing);
    setSaving(true);
    const result = await saveDecision(decision.id, fromForm(form));
    setSaving(false);
    if (!result.ok) return setError(result.error);
    setError(null);
    setForm(null);
    refresh();
  }

  async function remove() {
    if (!window.confirm(`Delete this decision and the ${documents.length} document(s) filed in it? This can't be undone.`)) return;
    const result = await removeDecision(decision.id);
    if (!result.ok) return setError(result.error);
    onDeleted(decision.id);
  }

  const set = (patch: Partial<DecisionForm>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const edited = people[decision.updatedBy ?? ""];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-mono text-xl font-semibold text-ink">{decision.ticker}</h2>
            <ActionBadge action={decision.action} />
            <StatusBadge status={decision.status} />
          </div>
          <p className="mt-1 text-sm text-muted">
            {decision.companyName ?? "—"} · {longDate(decision.decisionDate)} · {semesterOf(decision.decisionDate)}
          </p>
          <p className="mt-2 max-w-3xl text-sm text-ink">{decision.thesisSummary}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {editing ? (
            <>
              <SubmitButton type="button" onClick={save} pending={saving}>
                Save
              </SubmitButton>
              <SubmitButton
                type="button"
                variant="ghost"
                onClick={() => {
                  setForm(null);
                  setError(null);
                }}
              >
                Cancel
              </SubmitButton>
            </>
          ) : (
            <>
              <SubmitButton type="button" onClick={() => setForm(toForm(decision))}>
                Edit
              </SubmitButton>
              <a
                href={`/print/decision/${decision.id}`}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center justify-center rounded-md border border-line-strong bg-surface px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
              >
                Export PDF
              </a>
              {me.role === "advisor" || decision.isSample ? (
                <SubmitButton type="button" variant="danger" onClick={remove}>
                  Delete
                </SubmitButton>
              ) : null}
            </>
          )}
        </div>
      </div>

      <p className="text-xs text-faint">
        Last edited{edited ? ` by ${edited}` : ""} on{" "}
        {new Date(decision.updatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
        {editing ? " · editing: changes on every tab are saved together" : ""}
      </p>
      <FieldError>{error}</FieldError>

      <TabBar
        label="Sections of this decision"
        size="sm"
        panelId={panelId}
        active={section}
        onSelect={(id) => setSection(id as Section)}
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "thesis", label: "Thesis" },
          { id: "documents", label: `Documents (${documents.length})` },
          { id: "review", label: "Review" },
        ]}
      />

      <div
        role="tabpanel"
        id={panelId}
        aria-labelledby={`${panelId}-tab-${section}`}
        key={section}
        className={cn(styles.panel, "rounded-lg border border-line bg-surface p-4 sm:p-6")}
      >
        {section === "overview" ? (
          form ? (
            <BasicsFields form={form} set={set} options={options} selfId={decision.id} />
          ) : (
            <Overview decision={decision} options={options} proposalVotes={proposalVotes} onOpen={onOpen} />
          )
        ) : null}

        {section === "thesis" ? (
          form ? (
            <ThesisFields form={form} set={set} />
          ) : (
            <div className="flex flex-col gap-5">
              <Facts
                items={[
                  ["Valuation method", decision.valuationMethod],
                  ["Intrinsic value", decision.intrinsicValue == null ? null : money2(decision.intrinsicValue)],
                  ["Price target", decision.priceTarget == null ? null : money2(decision.priceTarget)],
                  [
                    "Margin of safety",
                    marginOfSafetyPct(decision.intrinsicValue, decision.price)?.toFixed(1).concat("%") ?? null,
                  ],
                ]}
              />
              {decision.thesis ? (
                <ThesisView doc={decision.thesis} className="border-t border-line pt-5" />
              ) : (
                <EmptyState title="No thesis written yet" hint="Choose Edit to write it under the prompted sections." />
              )}
            </div>
          )
        ) : null}

        {section === "documents" ? (
          <DocumentsPanel decisionId={decision.id} documents={documents} people={people} me={me} />
        ) : null}

        {section === "review" ? (
          form ? (
            <ReviewFields form={form} set={set} />
          ) : decision.reviewOutcome || decision.reviewNotes || decision.reviewLessons || decision.reviewedOn ? (
            <div className="flex flex-col gap-5">
              <Facts
                items={[
                  ["Did the thesis play out?", decision.reviewOutcome ? OUTCOME_LABEL[decision.reviewOutcome] : null],
                  ["Return since decision", decision.reviewReturnPct == null ? null : signedPct(decision.reviewReturnPct)],
                  [
                    "Benchmark (80/20 ACWI/AGG)",
                    decision.reviewBenchmarkPct == null ? null : signedPct(decision.reviewBenchmarkPct),
                  ],
                  ["Date reviewed", decision.reviewedOn ? longDate(decision.reviewedOn) : null],
                ]}
              />
              <Prose title="What happened" text={decision.reviewNotes} />
              <Prose title="Lessons learned" text={decision.reviewLessons} />
            </div>
          ) : (
            <EmptyState
              title="Not reviewed yet"
              hint="Come back later and choose Edit to record whether the thesis played out."
            />
          )
        ) : null}
      </div>
    </div>
  );
}

function Facts({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-faint">{label}</dt>
          <dd className="mt-1 text-sm text-ink tnum">{value ?? <span className="text-faint">Not recorded</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

function Prose({ title, text }: { title: string; text: string | null }) {
  if (!text) return null;
  return (
    <div className="border-t border-line pt-4">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">{text}</p>
    </div>
  );
}

function Overview({
  decision: d,
  options,
  proposalVotes,
  onOpen,
}: {
  decision: Decision;
  options: FieldOptions;
  proposalVotes: Record<string, VoteTally>;
  onOpen: (id: string) => void;
}) {
  const proposal = options.proposals.find((p) => p.id === d.proposalId);
  const trade = options.trades.find((t) => t.id === d.tradeId);
  const original = options.decisions.find((x) => x.id === d.relatedDecisionId);
  const followUps = options.decisions.filter((x) => x.relatedDecisionId === d.id);
  const tally = d.proposalId ? proposalVotes[d.proposalId] : undefined;

  const votes = tally
    ? `${tally.inFavor} in favor · ${tally.against} against · ${tally.needsReview} needs review (from the linked proposal)`
    : d.votesFor != null || d.votesAgainst != null || d.votesAbstain != null
      ? `${d.votesFor ?? 0} for · ${d.votesAgainst ?? 0} against · ${d.votesAbstain ?? 0} abstain`
      : null;

  return (
    <div className="flex flex-col gap-6">
      <Facts
        items={[
          ["Action", d.action === "buy" ? "Buy" : "Sell"],
          ["Decision date", longDate(d.decisionDate)],
          ["Status", STATUS_LABEL[d.status]],
          ["Strategy sleeve", options.strategies.find((s) => s.id === d.strategyId)?.name ?? null],
          ["Shares", d.shares == null ? null : formatShares(d.shares)],
          ["Price at decision", d.price == null ? null : money2(d.price)],
          ["Position size", d.positionPct == null ? null : `${d.positionPct}% of fund`],
          ["Analyst(s) who pitched it", d.analysts],
        ]}
      />
      <Facts
        items={[
          ["Vote result", votes],
          [
            "Linked proposal",
            proposal ? (
              <Link href="/proposals" className="text-brand hover:underline">
                {proposal.action === "buy" ? "Buy" : "Sell"} {proposal.shares} {proposal.ticker} · {proposal.status}
              </Link>
            ) : null,
          ],
          [
            "Linked trade",
            trade ? (
              <Link href="/transactions" className="text-brand hover:underline">
                {trade.action === "buy" ? "Bought" : "Sold"} {formatShares(trade.shares)} at {money2(trade.price)} ·{" "}
                {longDate(trade.tradeDate)}
              </Link>
            ) : null,
          ],
          [
            d.action === "sell" ? "Original buy decision" : "Sold by",
            d.action === "sell" ? (
              original ? (
                <OpenLink decision={original} onOpen={onOpen} />
              ) : null
            ) : followUps.length ? (
              <span className="flex flex-col gap-1">
                {followUps.map((f) => (
                  <OpenLink key={f.id} decision={f} onOpen={onOpen} />
                ))}
              </span>
            ) : null,
          ],
        ]}
      />
      <PositionTimeline current={d} decisions={options.decisions} onOpen={onOpen} />
    </div>
  );
}

function OpenLink({ decision, onOpen }: { decision: Decision; onOpen: (id: string) => void }) {
  return (
    <button type="button" onClick={() => onOpen(decision.id)} className="text-left text-brand hover:underline">
      {decision.action === "buy" ? "Buy" : "Sell"} {decision.ticker} · {longDate(decision.decisionDate)}
    </button>
  );
}

/** Every decision on this ticker in date order: bought, added, sold. */
function PositionTimeline({
  current,
  decisions,
  onOpen,
}: {
  current: Decision;
  decisions: Decision[];
  onOpen: (id: string) => void;
}) {
  const history = decisions
    .filter((d) => d.ticker === current.ticker)
    .sort((a, b) => a.decisionDate.localeCompare(b.decisionDate) || a.createdAt.localeCompare(b.createdAt));

  let held = false;
  const events = history.map((d) => {
    const acted = d.status === "approved" || d.status === "executed" || d.status === "closed";
    let verb: string;
    if (!acted) verb = `${d.action === "buy" ? "Buy" : "Sell"} ${STATUS_LABEL[d.status].toLowerCase()}`;
    else if (d.action === "sell") {
      verb = "Sold";
      held = false;
    } else {
      verb = held ? "Added" : "Bought";
      held = true;
    }
    return { d, verb, acted };
  });

  return (
    <div className="border-t border-line pt-5">
      <h3 className="text-sm font-semibold text-ink">{current.ticker} position history</h3>
      <p className="mt-0.5 text-xs text-muted">Every decision filed on this ticker, oldest first.</p>
      <ol className="mt-4 flex flex-col gap-0">
        {events.map(({ d, verb, acted }, i) => (
          <li key={d.id} className="relative flex gap-3 pb-4 last:pb-0">
            {i < events.length - 1 ? <span aria-hidden className="absolute left-[5px] top-4 h-full w-px bg-line-strong" /> : null}
            <span
              aria-hidden
              className={cn(
                "relative mt-1 h-[11px] w-[11px] shrink-0 rounded-full border-2",
                !acted ? "border-line-strong bg-surface" : d.action === "buy" ? "border-pos bg-pos" : "border-neg bg-neg",
              )}
            />
            <div className="min-w-0 text-sm">
              {d.id === current.id ? (
                <span className="font-medium text-ink">
                  {verb} on {longDate(d.decisionDate)}
                  {d.price != null ? ` at ${money2(d.price)}` : ""} <span className="font-normal text-faint">(this decision)</span>
                </span>
              ) : (
                <button type="button" onClick={() => onOpen(d.id)} className="text-left text-brand hover:underline">
                  {verb} on {longDate(d.decisionDate)}
                  {d.price != null ? ` at ${money2(d.price)}` : ""}
                </button>
              )}
              {d.shares != null ? <span className="text-muted"> · {formatShares(d.shares)} shares</span> : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
