"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { cn } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { Role } from "@/lib/types";

const NAV: { href: string; label: string; roles: Role[]; group: "fund" | "desk" | "admin" }[] = [
  { href: "/overview", label: "Overview", roles: ["advisor", "pm"], group: "fund" },
  { href: "/holdings", label: "Holdings", roles: ["advisor", "pm"], group: "fund" },
  { href: "/transactions", label: "Transactions", roles: ["advisor", "pm"], group: "fund" },
  { href: "/proposals", label: "Proposals", roles: ["advisor", "pm"], group: "fund" },
  { href: "/research", label: "Research", roles: ["advisor", "pm"], group: "desk" },
  { href: "/admin", label: "Admin", roles: ["advisor"], group: "admin" },
];

export function Sidebar({
  user,
  pendingProposals,
}: {
  user: { name: string; role: Role };
  pendingProposals: number;
}) {
  const pathname = usePathname();
  const items = NAV.filter((n) => n.roles.includes(user.role));

  return (
    <div className="flex h-full flex-col gap-6 px-4 py-5">
      <div className="px-2">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="grid h-7 w-7 place-items-center rounded-md bg-brand text-xs font-bold text-brand-contrast"
          >
            EF
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-ink">Eagle Fund</p>
            <p className="text-[11px] text-faint">Tracker · shadow ledger</p>
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-faint">
          The fund
        </p>
        {items
          .filter((i) => i.group === "fund")
          .map((item) => (
            <NavLink
              key={item.href}
              {...item}
              active={pathname.startsWith(item.href)}
              badge={item.href === "/proposals" && pendingProposals > 0 ? pendingProposals : undefined}
            />
          ))}

        <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-faint">
          Research desk
        </p>
        {items
          .filter((i) => i.group === "desk")
          .map((item) => (
            <NavLink key={item.href} {...item} active={pathname.startsWith(item.href)} />
          ))}

        {items.some((i) => i.group === "admin") ? (
          <>
            <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-faint">
              Faculty
            </p>
            {items
              .filter((i) => i.group === "admin")
              .map((item) => (
                <NavLink key={item.href} {...item} active={pathname.startsWith(item.href)} />
              ))}
          </>
        ) : null}
      </nav>

      <div className="flex flex-col gap-3 border-t border-line pt-4">
        <div className="px-2">
          <p className="text-sm font-medium text-ink">{user.name}</p>
          <p className="text-[11px] capitalize text-faint">
            {user.role === "advisor" ? "Faculty advisor" : "Portfolio manager"}
          </p>
          <Link
            href="/account"
            className="mt-1 inline-block text-[11px] text-muted hover:text-ink hover:underline"
          >
            Change password
          </Link>
        </div>
        <div className="flex items-center justify-between px-1">
          <ThemeToggle />
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md px-2.5 py-1.5 text-xs text-muted hover:bg-surface-2 hover:text-ink"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function NavLink({
  href,
  label,
  active,
  badge,
}: {
  href: string;
  label: string;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
        active ? "bg-brand/10 font-medium text-brand" : "text-muted hover:bg-surface-2 hover:text-ink",
      )}
    >
      <span>{label}</span>
      {badge ? (
        <span className="rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
