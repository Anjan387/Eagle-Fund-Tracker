"use client";

import { useActionState, useState } from "react";
import { updateTeamMember, type AdminFormState } from "@/app/actions/admin";
import { FieldError, FormOk, inputClass, labelClass, SubmitButton } from "@/components/ui";

const initial: AdminFormState = {};

/** An "Edit" button that opens a small form for a person's name, email and role. */
export function EditMember({
  user,
  isSelf,
}: {
  user: { id: string; name: string; email: string; role: "advisor" | "pm" };
  isSelf: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updateTeamMember, initial);

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="rounded-md border border-line-strong px-2.5 py-1 text-xs text-muted hover:bg-surface-2 hover:text-ink"
      >
        {open ? "Close" : "Edit"}
      </button>
      {open ? (
        <form
          action={action}
          className="mt-3 grid w-72 max-w-full gap-3 rounded-md border border-line bg-surface-2 p-3 text-left"
        >
          <input type="hidden" name="userId" value={user.id} />
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Full name</span>
            <input name="name" defaultValue={user.name} required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Email (also their sign-in)</span>
            <input name="email" type="email" defaultValue={user.email} required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Role</span>
            <select name="role" defaultValue={user.role} className={inputClass}>
              <option value="pm">Portfolio manager</option>
              <option value="advisor">Faculty advisor</option>
            </select>
          </label>
          <div className="flex flex-col gap-2">
            {isSelf ? (
              <p className="text-[11px] text-faint">
                This is you. If you change your own role to portfolio manager you lose access to this page.
              </p>
            ) : null}
            <FieldError>{state.error}</FieldError>
            {state.ok && state.message ? <FormOk>{state.message}</FormOk> : null}
            <SubmitButton pending={pending} className="self-start">
              Save changes
            </SubmitButton>
          </div>
        </form>
      ) : null}
    </>
  );
}
