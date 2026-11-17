"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { logout } from "@/app/actions/auth";
import { cn } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  IconArrows,
  IconBook,
  IconBriefcase,
  IconChart,
  IconDashboard,
  IconFile,
  IconHistory,
  IconLogOut,
  IconScale,
  IconSearch,
  IconShield,
} from "@/components/icons";
import type { Role } from "@/lib/types";

type Group = "fund" | "desk" | "admin";

const NAV: { href: string; label: string; roles: Role[]; group: Group; icon: ComponentType<{ size?: number }> }[] = [
  { href: "/overview", label: "Overview", roles: ["advisor", "pm"], group: "fund", icon: IconDashboard },
  { href: "/holdings", label: "Holdings", roles: ["advisor", "pm"], group: "fund", icon: IconBriefcase },
  { href: "/analytics", label: "Analytics", roles: ["advisor", "pm"], group: "fund", icon: IconChart },
  { href: "/transactions", label: "Transactions", roles: ["advisor", "pm"], group: "fund", icon: IconArrows },
  { href: "/proposals", label: "Proposals", roles: ["advisor", "pm"], group: "fund", icon: IconFile },
  { href: "/decisions", label: "Decision Log", roles: ["advisor", "pm"], group: "fund", icon: IconBook },
  { href: "/ips", label: "Investment Policy", roles: ["advisor", "pm"], group: "fund", icon: IconScale },
  { href: "/history", label: "Fund History", roles: ["advisor", "pm"], group: "fund", icon: IconHistory },
  { href: "/research", label: "Research", roles: ["advisor", "pm"], group: "desk", icon: IconSearch },
  { href: "/admin", label: "Admin", roles: ["advisor"], group: "admin", icon: IconShield },
];

const GROUP_LABEL: Record<Group, string> = { fund: "The fund", desk: "Research desk", admin: "Faculty" };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

/**
 * The app's navigation, on Juniata Blue.
 * `rail` (the desktop sidebar): an icon rail from 768px, the full sidebar
 * from 1024px. Without it (the mobile menu) it is always full.
 */
export function Sidebar({
  user,
  pendingProposals,
  rail = false,
}: {
  user: { name: string; role: Role };
  pendingProposals: number;
  rail?: boolean;
}) {
  const pathname = usePathname();
  const items = NAV.filter((n) => n.roles.includes(user.role));
  // labels hide in the rail (768-1023px) and show from 1024px, or always in the mobile menu
  const label = rail ? "hidden lg:inline" : "";
  const roleLabel = user.role === "advisor" ? "Faculty advisor" : "Portfolio manager";

  return (
    <div className="flex h-full flex-col bg-sidebar text-on-sidebar">
      {/* logo */}
      <div className={cn("flex items-center gap-2.5 border-b border-sidebar-line px-4 py-5", rail && "justify-center px-0 lg:justify-start lg:px-4")}>
        <span
          aria-hidden
          className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-gold text-[13px] font-bold tracking-tight text-on-gold"
        >
          EF
        </span>
        <div className={cn("min-w-0 leading-tight", label)}>
          <p className="text-[15px] font-semibold">Eagle Fund</p>
          <p className="mt-0.5 whitespace-nowrap text-[11px] tracking-tight text-on-sidebar/70">Juniata College · Shadow Ledger</p>
        </div>
      </div>

      {/* navigation */}
      <nav aria-label="Main" className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
        {(["fund", "desk", "admin"] as Group[]).map((group, gi) => {
          const groupItems = items.filter((i) => i.group === group);
          if (groupItems.length === 0) return null;
          return (
            <div key={group} className="flex flex-col gap-0.5">
              <p
                className={cn(
                  "px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-sidebar-label",
                  gi > 0 && "pt-5",
                  label,
                )}
              >
                {GROUP_LABEL[group]}
              </p>
              {rail && gi > 0 ? <span aria-hidden className="mx-3 my-2 border-t border-sidebar-line lg:hidden" /> : null}
              {groupItems.map((item) => {
                const active = pathname.startsWith(item.href);
                const badge = item.href === "/proposals" && pendingProposals > 0 ? pendingProposals : undefined;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    title={item.label}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150",
                      rail && "justify-center lg:justify-start",
                      active
                        ? "bg-sidebar-active font-medium text-on-sidebar"
                        : "text-on-sidebar/80 hover:bg-sidebar-hover hover:text-on-sidebar",
                    )}
                  >
                    {active ? <span aria-hidden className="absolute inset-y-1.5 left-0 w-[3px] rounded-r bg-gold" /> : null}
                    <span className="relative shrink-0">
                      <Icon size={18} />
                      {badge && rail ? (
                        <span aria-hidden className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-gold lg:hidden" />
                      ) : null}
                    </span>
                    <span className={cn("flex-1 truncate", label)}>{item.label}</span>
                    {badge ? (
                      <span
                        className={cn(
                          "rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-semibold leading-none text-on-gold",
                          label,
                        )}
                      >
                        {badge}
                        <span className="sr-only"> pending</span>
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* user */}
      <div className={cn("flex items-center gap-3 border-t border-sidebar-line px-4 py-4", rail && "flex-col lg:flex-row")}>
        <Link
          href="/account"
          title={`${user.name} · account settings`}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sidebar-active text-xs font-semibold text-on-sidebar ring-1 ring-sidebar-line transition-colors duration-150 hover:bg-sidebar-hover"
        >
          {initials(user.name)}
          <span className="sr-only">Account settings</span>
        </Link>
        <div className={cn("min-w-0 flex-1 leading-tight", label)}>
          <Link href="/account" className="block truncate text-sm font-medium hover:underline">
            {user.name}
          </Link>
          <p className="mt-0.5 truncate text-[11px] text-on-sidebar/70">{roleLabel}</p>
        </div>
        <div className={cn("flex items-center gap-1", rail && "flex-col lg:flex-row")}>
          <ThemeToggle />
          <form action={logout}>
            <button
              type="submit"
              title="Sign out"
              aria-label="Sign out"
              className="grid h-8 w-8 place-items-center rounded-md text-on-sidebar/80 transition-colors duration-150 hover:bg-sidebar-hover hover:text-on-sidebar"
            >
              <IconLogOut size={17} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
