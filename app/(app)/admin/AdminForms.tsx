"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  addPmAccount,
  saveReturns,
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
  benchmarkTrailingReturnPct,
  cashBalance,
}: {
  fundTrailingReturnPct: number;
  benchmarkTrailingReturnPct: number;
  cashBalance: number;
}) {
  const [state, action, pending] = useActionState(saveReturns, initial);
  return (
    <form action={action} className="grid gap-3 px-5 py-5 sm:grid-cols-3 sm:items-end">
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Fund trailing 12-mo return (%)</span>
        <input
          name="fundTrailingReturnPct"
          type="number"
          step="0.01"
          defaultValue={fundTrailingReturnPct}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Benchmark trailing return (%)</span>
        <input
          name="benchmarkTrailingReturnPct"
          type="number"
          step="0.01"
          defaultValue={benchmarkTrailingReturnPct}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Cash balance (USD)</span>
        <input
          name="cashBalance"
          type="number"
          step="1"
          defaultValue={cashBalance}
          className={inputClass}
        />
      </label>
      <SubmitButton pending={pending} variant="ghost">
        Save figures
      </SubmitButton>
      <div className="sm:col-span-3 flex flex-col gap-2">
        <FieldError>{state.error}</FieldError>
        {state.ok ? <FormOk>Overview figures updated.</FormOk> : null}
      </div>
    </form>
  );
}
