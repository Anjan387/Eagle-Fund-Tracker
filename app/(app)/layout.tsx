import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import { getProposals } from "@/lib/store";
import { Sidebar } from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const proposals = await getProposals();
  const pendingProposals = proposals.filter((p) => p.status === "pending").length;
  const navUser = { name: user.name, role: user.role };

  return (
    <div className="min-h-full lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r border-line bg-surface lg:sticky lg:top-0 lg:block lg:h-screen">
        <Sidebar user={navUser} pendingProposals={pendingProposals} />
      </aside>

      <details className="group border-b border-line bg-surface lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
          <span className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded bg-brand text-[10px] font-bold text-brand-contrast">
              EF
            </span>
            <span className="text-sm font-semibold text-ink">Eagle Fund Tracker</span>
          </span>
          <span className="text-xs text-muted group-open:hidden">Menu</span>
          <span className="hidden text-xs text-muted group-open:inline">Close</span>
        </summary>
        <div className="border-t border-line">
          <Sidebar user={navUser} pendingProposals={pendingProposals} />
        </div>
      </details>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        {children}
      </main>
    </div>
  );
}
