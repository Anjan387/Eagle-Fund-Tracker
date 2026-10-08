"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  addCashEvent,
  addPmAccount,
  recordDividend,
  saveReturnOverrides,
  saveSnapshot,
  type AdminFormState,
} from "@/app/actions/admin";
import { FieldError, FormOk, inputClass, labelClass, SubmitButton } from "@/components/ui";

const initial: AdminFormState = {};

export function AddPmForm() {
  const [state, action, pending] = useActionState(addPmAccount, initial);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <form ref={ref} action={action} className="grid gap-3 px-5 py-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Full name</span>
        <input name="name" required className={inputClass} placeholder="Jordan Lee" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Email</span>
        <input name="email" type="email" required className={inputClass} placeholder="leej@juniata.edu" />
      </label>
      <SubmitButton pending={pending}>Add PM</SubmitButton>
      <div className="sm:col-span-3 flex flex-col gap-2">
        <FieldError>{state.error}</FieldError>
        {state.ok && state.message ? <FormOk>{state.message}</FormOk> : null}
      </div>
    </form>
  );
}

export function SnapshotForm() {
  const [state, action, pending] = useActionState(saveSnapshot, initial);
  return (
    <form action={action} className="grid gap-3 px-5 py-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Year</span>
        <input
          name="year"
          type="number"
          required
          defaultValue={new Date().getFullYear() - 1}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Year-end total value (USD)</span>
        <input name="totalValue" type="number" step="1" required className={inputClass} />
      </label>
      <SubmitButton pending={pending} variant="ghost">
        Save year
      </SubmitButton>
      <div className="sm:col-span-3 flex flex-col gap-2">
        <FieldError>{state.error}</FieldError>
        {state.ok ? <FormOk>Snapshot saved.</FormOk> : null}
      </div>
    </form>
  );
}

export function ReturnsForm({
  fundTrailingReturnPct,
  fundReturnBasis,
  fundOverridePct,
  benchmarkTrailingReturnPct,
  benchmarkReturnBasis,
  benchmarkOverridePct,
}: {
  fundTrailingReturnPct: number;
  fundReturnBasis: string;
  fundOverridePct: number | null;
  benchmarkTrailingReturnPct: number;
  benchmarkReturnBasis: string;
  benchmarkOverridePct: number | null;
}) {
  const [state, action, pending] = useActionState(saveReturnOverrides, initial);
  const basisLabel: Record<string, string> = {
    "trailing-12mo": "computed — true trailing 12 months",
    "since-rebuild": "computed — since the April 2026 rebuild (not a year of history yet)",
    override: "advisor override",
  };
  return (
    <form action={action} className="grid gap-3 px-5 py-5 sm:grid-cols-2 sm:items-end">
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>
          Fund trailing return: <span className="tnum text-ink">{fundTrailingReturnPct.toFixed(2)}%</span>{" "}
          <span className="font-normal normal-case text-faint">({basisLabel[fundReturnBasis]})</span>
        </span>
        <input
          name="fundTrailingReturnOverridePct"
          type="number"
          step="0.01"
          defaultValue={fundOverridePct ?? ""}
          placeholder="Override (leave blank to use the computed value)"
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>
          Benchmark (80/20 ACWI/AGG): <span className="tnum text-ink">{benchmarkTrailingReturnPct.toFixed(2)}%</span>{" "}
          <span className="font-normal normal-case text-faint">({basisLabel[benchmarkReturnBasis]})</span>
        </span>
        <input
          name="benchmarkTrailingReturnOverridePct"
          type="number"
          step="0.01"
          defaultValue={benchmarkOverridePct ?? ""}
          placeholder="Override (leave blank to use the computed value)"
          className={inputClass}
        />
      </label>
      <SubmitButton pending={pending} variant="ghost">
        Save overrides
      </SubmitButton>
      <div className="sm:col-span-2 flex flex-col gap-2">
        <FieldError>{state.error}</FieldError>
        {state.ok ? <FormOk>Saved. Overview now reflects these overrides (blank = computed value).</FormOk> : null}
      </div>
    </form>
  );
}

const CASH_KINDS = [
  { value: "deposit", label: "Deposit" },
  { value: "withdrawal", label: "Withdrawal" },
  { value: "fee", label: "Fee" },
  { value: "adjustment", label: "Adjustment (correct a mistake)" },
] as const;

export function CashEventForm() {
  const [state, action, pending] = useActionState(addCashEvent, initial);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <form
      ref={ref}
      action={action}
      className="grid gap-3 px-5 py-5 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] sm:items-end"
    >
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Type</span>
        <select name="kind" required defaultValue="deposit" className={inputClass}>
          {CASH_KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Amount (USD)</span>
        <input name="amount" type="number" step="0.01" required className={inputClass} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Date</span>
        <input
          name="occurredOn"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Memo</span>
        <input name="memo" className={inputClass} placeholder="Optional" />
      </label>
      <SubmitButton pending={pending}>Log event</SubmitButton>
      <div className="sm:col-span-5 flex flex-col gap-2">
        <FieldError>{state.error}</FieldError>
        {state.ok ? <FormOk>Cash event recorded.</FormOk> : null}
      </div>
    </form>
  );
}

export function DividendForm({ tickers }: { tickers: string[] }) {
  const [state, action, pending] = useActionState(recordDividend, initial);
  const ref = useRef<HTMLFormElement>(null);
  const [reinvest, setReinvest] = useState(false);
  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      setReinvest(false);
    }
  }, [state.ok]);

  return (
    <form ref={ref} action={action} className="flex flex-col gap-3 px-5 py-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Paid by</span>
          <select name="tickerPaid" defaultValue="" className={inputClass}>
            <option value="">Not tied to a specific holding</option>
            {tickers.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Amount (USD)</span>
          <input name="amount" type="number" step="0.01" min="0.01" required className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Date</span>
          <input
            name="occurredOn"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className={inputClass}
          />
        </label>
        <SubmitButton pending={pending}>Log dividend</SubmitButton>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={reinvest}
          onChange={(e) => setReinvest(e.target.checked)}
          className="h-4 w-4 rounded border-line-strong accent-brand"
        />
        Reinvest this dividend (buy more shares with it instead of holding it as cash)
        <input type="hidden" name="reinvest" value={reinvest ? "true" : "false"} />
      </label>

      {reinvest ? (
        <label className="flex max-w-xs flex-col gap-1.5">
          <span className={labelClass}>Reinvest into</span>
          <select name="reinvestInto" required={reinvest} defaultValue="" className={inputClass}>
            <option value="" disabled>
              Choose a current holding…
            </option>
            {tickers.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <span className="text-[11px] text-faint">
            Shares are computed from the dividend amount at that holding&apos;s current price —
            same as a real DRIP, fractional shares included.
          </span>
        </label>
      ) : null}

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Memo</span>
        <input name="memo" className={inputClass} placeholder="Optional" />
      </label>

      <div className="flex flex-col gap-2">
        <FieldError>{state.error}</FieldError>
        {state.ok ? <FormOk>{state.message ?? "Dividend recorded."}</FormOk> : null}
      </div>
    </form>
  );
}
