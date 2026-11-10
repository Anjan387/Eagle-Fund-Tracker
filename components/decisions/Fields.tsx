"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { cn, inputClass, labelClass } from "@/components/ui";
import { TickerAutocomplete } from "@/components/TickerAutocomplete";
import { longDate, money2 } from "@/lib/format";
import {
  DECISION_STATUSES,
  marginOfSafetyPct,
  OUTCOME_LABEL,
  REVIEW_OUTCOMES,
  STATUS_LABEL,
  type Decision,
  type DecisionStatus,
  type ReviewOutcome,
} from "@/lib/decision-types";
import type { DecisionForm, SetForm } from "./form";

// The inputs for a decision, in the three groups both the "new decision"
// steps and the edit mode of an open decision use.

const ThesisEditor = dynamic(() => import("./ThesisEditor"), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-md bg-surface-2 motion-reduce:animate-none" />,
});

export interface ProposalOption {
  id: string;
  ticker: string;
  action: "buy" | "sell";
  shares: number;
  strategyId: string;
  status: string;
  createdAt: string;
}
export interface TradeOption {
  id: string;
  ticker: string;
  action: "buy" | "sell";
  shares: number;
  price: number;
  tradeDate: string;
  strategyId: string;
}
export interface FieldOptions {
  strategies: { id: string; name: string }[];
  proposals: ProposalOption[];
  trades: TradeOption[];
  decisions: Decision[];
}

export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className={labelClass}>{label}</span>
      {children}
      {hint ? <span className="text-[11px] text-faint">{hint}</span> : null}
    </label>
  );
}

const number = { type: "number", inputMode: "decimal", step: "any", className: inputClass } as const;

export function BasicsFields({
  form,
  set,
  options,
  selfId,
}: {
  form: DecisionForm;
  set: SetForm;
  options: FieldOptions;
  selfId?: string;
}) {
  const ticker = form.ticker.trim().toUpperCase();
  const sameTicker = <T extends { ticker: string }>(rows: T[]) => (ticker ? rows.filter((r) => r.ticker === ticker) : rows);
  const earlierBuys = sameTicker(options.decisions).filter((d) => d.action === "buy" && d.id !== selfId);

  // Linking an existing proposal or trade fills in whatever is still blank.
  function linkProposal(id: string) {
    const p = options.proposals.find((x) => x.id === id);
    set({
      proposalId: id,
      ...(p && {
        ticker: form.ticker || p.ticker,
        action: form.ticker ? form.action : p.action,
        shares: form.shares || String(p.shares),
        strategyId: form.strategyId || p.strategyId,
      }),
    });
  }
  function linkTrade(id: string) {
    const t = options.trades.find((x) => x.id === id);
    set({
      tradeId: id,
      ...(t && {
        ticker: form.ticker || t.ticker,
        action: form.ticker ? form.action : t.action,
        shares: form.shares || String(t.shares),
        price: form.price || String(t.price),
        strategyId: form.strategyId || t.strategyId,
      }),
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Ticker (required)">
        <TickerAutocomplete
          name="decision-ticker"
          value={form.ticker}
          onValueChange={(v) => set({ ticker: v })}
          required
          placeholder="Company name or ticker"
        />
      </Field>
      <Field label="Company name" hint="Left blank, it is looked up from the ticker when you save.">
        <input value={form.companyName} onChange={(e) => set({ companyName: e.target.value })} className={inputClass} />
      </Field>

      <fieldset className="flex flex-col gap-1.5">
        <legend className={cn(labelClass, "mb-1.5")}>Buy or sell (required)</legend>
        <div className="flex gap-2">
          {(["buy", "sell"] as const).map((a) => (
            <label
              key={a}
              className={cn(
                "flex-1 cursor-pointer rounded-md border px-3 py-2 text-center text-sm font-medium transition-colors",
                form.action === a
                  ? a === "buy"
                    ? "border-pos/30 bg-pos-soft text-pos"
                    : "border-neg/30 bg-neg-soft text-neg"
                  : "border-line-strong text-muted hover:bg-surface-2",
              )}
            >
              <input
                type="radio"
                name="decision-action"
                value={a}
                checked={form.action === a}
                onChange={() => set({ action: a })}
                className="sr-only"
              />
              {a === "buy" ? "Buy" : "Sell"}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Decision date (required)">
        <input
          type="date"
          value={form.decisionDate}
          onChange={(e) => set({ decisionDate: e.target.value })}
          required
          className={inputClass}
        />
      </Field>

      <Field label="One-line thesis summary (required)" className="sm:col-span-2">
        <input
          value={form.thesisSummary}
          onChange={(e) => set({ thesisSummary: e.target.value })}
          maxLength={240}
          required
          placeholder="The decision in one sentence"
          className={inputClass}
        />
      </Field>

      <Field label="Status">
        <select
          value={form.status}
          onChange={(e) => set({ status: e.target.value as DecisionStatus })}
          className={inputClass}
        >
          {DECISION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Strategy sleeve">
        <select value={form.strategyId} onChange={(e) => set({ strategyId: e.target.value })} className={inputClass}>
          <option value="">Not set</option>
          {options.strategies.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Shares">
        <input {...number} min="0" value={form.shares} onChange={(e) => set({ shares: e.target.value })} />
      </Field>
      <Field label="Price at decision ($)">
        <input {...number} min="0" value={form.price} onChange={(e) => set({ price: e.target.value })} />
      </Field>
      <Field label="Position size (% of fund)">
        <input {...number} min="0" value={form.positionPct} onChange={(e) => set({ positionPct: e.target.value })} />
      </Field>
      <Field label="Analyst(s) who pitched it">
        <input value={form.analysts} onChange={(e) => set({ analysts: e.target.value })} className={inputClass} />
      </Field>

      <Field
        label="Linked proposal"
        hint="Its votes are shown as the vote result, so they are not typed twice."
        className="sm:col-span-2"
      >
        <select value={form.proposalId} onChange={(e) => linkProposal(e.target.value)} className={inputClass}>
          <option value="">None</option>
          {sameTicker(options.proposals).map((p) => (
            <option key={p.id} value={p.id}>
              {p.action === "buy" ? "Buy" : "Sell"} {p.shares} {p.ticker} · {p.status} · proposed{" "}
              {longDate(p.createdAt.slice(0, 10))}
            </option>
          ))}
        </select>
      </Field>

      {form.proposalId ? null : (
        <fieldset className="sm:col-span-2">
          <legend className={cn(labelClass, "mb-1.5")}>Vote result (only if no proposal is linked)</legend>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ["votesFor", "For"],
                ["votesAgainst", "Against"],
                ["votesAbstain", "Abstain"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex flex-col gap-1">
                <span className="text-[11px] text-faint">{label}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={form[key]}
                  onChange={(e) => set({ [key]: e.target.value })}
                  className={inputClass}
                />
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <Field label="Linked trade" hint="The trade in the Transactions ledger that carried this out.">
        <select value={form.tradeId} onChange={(e) => linkTrade(e.target.value)} className={inputClass}>
          <option value="">None</option>
          {sameTicker(options.trades).map((t) => (
            <option key={t.id} value={t.id}>
              {t.action === "buy" ? "Bought" : "Sold"} {t.shares} {t.ticker} at {money2(t.price)} · {longDate(t.tradeDate)}
            </option>
          ))}
        </select>
      </Field>
      {form.action === "sell" ? (
        <Field label="Original buy decision" hint="Links this sell to the decision that opened the position.">
          <select
            value={form.relatedDecisionId}
            onChange={(e) => set({ relatedDecisionId: e.target.value })}
            className={inputClass}
          >
            <option value="">None</option>
            {earlierBuys.map((d) => (
              <option key={d.id} value={d.id}>
                Buy {d.ticker} · {longDate(d.decisionDate)}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
    </div>
  );
}

export function ThesisFields({ form, set }: { form: DecisionForm; set: SetForm }) {
  const margin = marginOfSafetyPct(
    form.intrinsicValue.trim() === "" ? null : Number(form.intrinsicValue),
    form.price.trim() === "" ? null : Number(form.price),
  );
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Valuation method" className="sm:col-span-2 lg:col-span-1">
          <input
            value={form.valuationMethod}
            onChange={(e) => set({ valuationMethod: e.target.value })}
            placeholder="DCF, multiples…"
            className={inputClass}
          />
        </Field>
        <Field label="Intrinsic value ($ per share)">
          <input {...number} min="0" value={form.intrinsicValue} onChange={(e) => set({ intrinsicValue: e.target.value })} />
        </Field>
        <Field label="Price target ($ per share)">
          <input {...number} min="0" value={form.priceTarget} onChange={(e) => set({ priceTarget: e.target.value })} />
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>Margin of safety</span>
          <p className="rounded-md border border-dashed border-line-strong px-3 py-2 text-sm text-ink tnum">
            {margin == null || !Number.isFinite(margin) ? "—" : `${margin.toFixed(1)}%`}
          </p>
          <span className="text-[11px] text-faint">Worked out from intrinsic value and price at decision.</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className={labelClass}>Full thesis</span>
        <ThesisEditor value={form.thesis} onChange={(doc) => set({ thesis: doc })} />
      </div>
    </div>
  );
}

export function ReviewFields({ form, set }: { form: DecisionForm; set: SetForm }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Did the thesis play out?">
        <select
          value={form.reviewOutcome}
          onChange={(e) => set({ reviewOutcome: e.target.value as ReviewOutcome | "" })}
          className={inputClass}
        >
          <option value="">Not reviewed yet</option>
          {REVIEW_OUTCOMES.map((o) => (
            <option key={o} value={o}>
              {OUTCOME_LABEL[o]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Date reviewed">
        <input
          type="date"
          value={form.reviewedOn}
          onChange={(e) => set({ reviewedOn: e.target.value })}
          className={inputClass}
        />
      </Field>
      <Field label="Return since decision (%)">
        <input {...number} value={form.reviewReturnPct} onChange={(e) => set({ reviewReturnPct: e.target.value })} />
      </Field>
      <Field label="Benchmark return over the same period (%)" hint="80/20 ACWI/AGG">
        <input {...number} value={form.reviewBenchmarkPct} onChange={(e) => set({ reviewBenchmarkPct: e.target.value })} />
      </Field>
      <Field label="What happened" className="sm:col-span-2">
        <textarea
          rows={4}
          value={form.reviewNotes}
          onChange={(e) => set({ reviewNotes: e.target.value })}
          className={inputClass}
        />
      </Field>
      <Field label="Lessons learned" className="sm:col-span-2">
        <textarea
          rows={4}
          value={form.reviewLessons}
          onChange={(e) => set({ reviewLessons: e.target.value })}
          className={inputClass}
        />
      </Field>
    </div>
  );
}
