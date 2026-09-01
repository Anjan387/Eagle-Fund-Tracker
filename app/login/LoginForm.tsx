"use client";

import { useActionState } from "react";
import { login, type AuthState } from "@/app/actions/auth";
import { FieldError, inputClass, labelClass, SubmitButton } from "@/components/ui";

const initial: AuthState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor="email">
          Juniata email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className={inputClass}
          placeholder="you@juniata.edu"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </div>
      <FieldError>{state.error}</FieldError>
      <SubmitButton pending={pending} className="w-full">
        Sign in
      </SubmitButton>
    </form>
  );
}
