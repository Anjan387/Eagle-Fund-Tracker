import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/overview");

  return (
    <div className="grid min-h-full place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-brand text-sm font-bold text-brand-contrast">
            EF
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-ink">Eagle Fund Tracker</h1>
            <p className="text-xs text-muted">Juniata College · student-managed fund</p>
          </div>
        </div>

        <Card className="p-6">
          <LoginForm />
        </Card>

        <div className="mt-4 rounded-md border border-line bg-surface-2 px-4 py-3 text-xs text-muted">
          <p>
            Accounts are created by the faculty advisor each semester — there is no sign-up.
            If you&apos;re a new PM and don&apos;t have a login yet, ask the advisor.
          </p>
        </div>

        <p className="mt-4 text-center text-[11px] text-faint">
          Shadow ledger only. No brokerage connection — the advisor&apos;s Schwab statement
          remains the fund&apos;s official record.
        </p>
      </div>
    </div>
  );
}
