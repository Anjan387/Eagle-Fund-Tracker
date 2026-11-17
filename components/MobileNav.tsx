"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { IconClose, IconMenu } from "@/components/icons";
import { Sidebar } from "@/components/Sidebar";
import type { Role } from "@/lib/types";

/**
 * Below 768px: a slim Juniata Blue bar with a hamburger that slides the full
 * sidebar in from the left. Closes on navigation, on Escape, or on a tap
 * outside it.
 */
export function MobileNav({ user, pendingProposals }: { user: { name: string; role: Role }; pendingProposals: number }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between bg-sidebar px-4 text-on-sidebar">
        <span className="flex items-center gap-2.5">
          <span aria-hidden className="grid h-7 w-7 place-items-center rounded-md bg-gold text-[11px] font-bold text-on-gold">
            EF
          </span>
          <span className="text-sm font-semibold">Eagle Fund</span>
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="grid h-9 w-9 place-items-center rounded-md text-on-sidebar/90 transition-colors duration-150 hover:bg-sidebar-hover"
        >
          <IconMenu size={20} />
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[var(--scrim)]"
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-pop">
            <Sidebar user={user} pendingProposals={pendingProposals} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-5 grid h-8 w-8 place-items-center rounded-md text-on-sidebar/80 transition-colors duration-150 hover:bg-sidebar-hover hover:text-on-sidebar"
            >
              <IconClose size={18} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
