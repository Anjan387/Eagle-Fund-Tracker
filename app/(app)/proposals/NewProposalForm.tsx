"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitProposal, type ProposalFormState } from "@/app/actions/proposals";
import { FieldError, FormOk, inputClass, labelClass, SubmitButton } from "@/components/ui";
import type { Strategy } from "@/lib/types";

const initial: ProposalFormState = {};

export function NewProposalForm({ strategies }: { strategies: Strategy[] }) {
  const [state, formAction, pending] = useActionState(submitProposal, initial);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <form ref={ref} action={formAction} className="grid gap-4 px-5 py-5 sm:grid-cols-2">
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Ticker</span>
        <input name="ticker" required className={inputClass} placeholder="INTU" />
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
        <span className={labelClass}>Rationale</span>
        <textarea
          name="rationale"
          rows={4}
          required
          className={`${inputClass} resize-y`}
          placeholder="Why this fits the strategy: valuation, moat, catalyst, how it sits against IPS position limits, any ESG considerations."
        />
      </label>
      <div className="sm:col-span-2 flex flex-col gap-2">
        <FieldError>{state.error}</FieldError>
        {state.ok ? <FormOk>Proposal submitted to the advisor queue.</FormOk> : null}
        <SubmitButton pending={pending} className="self-start">
          Submit proposal
        </SubmitButton>
      </div>
    </form>
  );
}
