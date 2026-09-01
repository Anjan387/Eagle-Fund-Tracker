"use client";

import { useActionState, useEffect, useRef } from "react";
import { recordTrade, type TradeFormState } from "@/app/actions/trades";
import { FieldError, FormOk, inputClass, labelClass, SubmitButton } from "@/components/ui";
import type { Strategy } from "@/lib/types";

const initial: TradeFormState = {};

export function AddTradeForm({
  strategies,
  approvedProposals,
}: {
  strategies: Strategy[];
  approvedProposals: {
    id: string;
    ticker: string;
    action: string;
    shares: number;
    strategyId: string;
  }[];
}) {
  const [state, formAction, pending] = useActionState(recordTrade, initial);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4 px-5 py-5 sm:grid-cols-2">
      {approvedProposals.length > 0 ? (
        <label className="sm:col-span-2 flex flex-col gap-1.5">
          <span className={labelClass}>Fill an approved proposal (optional)</span>
          <select
            name="proposalId"
            className={inputClass}
            defaultValue=""
            onChange={(e) => {
              const p = approvedProposals.find((x) => x.id === e.target.value);
              if (!p || !formRef.current) return;
              const f = formRef.current;
              (f.elements.namedItem("ticker") as HTMLInputElement).value = p.ticker;
              (f.elements.namedItem("action") as HTMLSelectElement).value = p.action;
              (f.elements.namedItem("shares") as HTMLInputElement).value = String(p.shares);
              (f.elements.namedItem("strategyId") as HTMLSelectElement).value = p.strategyId;
            }}
          >
            <option value="">Manual entry</option>
            {approvedProposals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.action.toUpperCase()} {p.shares} {p.ticker}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Ticker</span>
        <input name="ticker" required className={inputClass} placeholder="AAPL" />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Action</span>
        <select name="action" className={inputClass} defaultValue="buy">
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Shares</span>
        <input name="shares" type="number" step="any" min="0" required className={inputClass} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Execution price (USD)</span>
        <input name="price" type="number" step="any" min="0" required className={inputClass} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Trade date</span>
        <input name="tradeDate" type="date" defaultValue={today} required className={inputClass} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Strategy</span>
        <select name="strategyId" className={inputClass} defaultValue="">
          <option value="" disabled>
            Choose…
          </option>
          {strategies.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <label className="sm:col-span-2 flex flex-col gap-1.5">
        <span className={labelClass}>Notes (optional)</span>
        <input name="notes" className={inputClass} placeholder="Context for the audit trail" />
      </label>

      <div className="sm:col-span-2 flex flex-col gap-2">
        <FieldError>{state.error}</FieldError>
        {state.ok ? <FormOk>Trade recorded and holdings updated.</FormOk> : null}
        <SubmitButton pending={pending} className="self-start">
          Record trade
        </SubmitButton>
      </div>
    </form>
  );
}
