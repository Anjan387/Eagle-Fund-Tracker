"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePassword, type AccountFormState } from "@/app/actions/account";
import { FieldError, FormOk, inputClass, labelClass, SubmitButton } from "@/components/ui";

const initial: AccountFormState = {};

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, initial);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <form ref={ref} action={action} className="flex max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Current password</span>
        <input
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>New password</span>
        <input
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Confirm new password</span>
        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClass}
        />
      </label>
      <FieldError>{state.error}</FieldError>
      {state.ok ? <FormOk>Password updated.</FormOk> : null}
      <SubmitButton pending={pending} className="self-start">
        Update password
      </SubmitButton>
    </form>
  );
}
