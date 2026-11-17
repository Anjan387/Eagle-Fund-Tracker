import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import { getProposals } from "@/lib/store";
import { MobileNav } from "@/components/MobileNav";
import { Sidebar } from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const proposals = await getProposals();
  const pendingProposals = proposals.filter((p) => p.status === "pending").length;
  const navUser = { name: user.name, role: user.role };

  return (
    // sidebar: an icon rail from 768px, full width from 1024px; below 768px, MobileNav
    <div className="min-h-full md:grid md:grid-cols-[72px_minmax(0,1fr)] lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="hidden md:sticky md:top-0 md:block md:h-screen">
        <Sidebar user={navUser} pendingProposals={pendingProposals} rail />
      </aside>

      <MobileNav user={navUser} pendingProposals={pendingProposals} />

      <main className="mx-auto w-full min-w-0 max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
