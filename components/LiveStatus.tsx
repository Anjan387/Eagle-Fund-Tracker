"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Keeps a page's prices moving while it is open: polls /api/live-quotes (which
// refreshes whichever held tickers are due) and re-renders the page's server
// data whenever a quote has changed. Also the small "Live" pill in the header.

interface Status {
  ready: boolean;
  marketOpen: boolean;
  polling: boolean;
  asOf: string | null;
  updated: string[];
}

const POLL_MS = 60_000; // while quotes are being refreshed
const IDLE_MS = 5 * 60_000; // market closed: just watch for the open

export function LiveStatus() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const seen = useRef<string | null>(null);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      clearTimeout(timer);
      let next = IDLE_MS;
      // a hidden tab doesn't spend API credits; it catches up when it's shown again
      if (document.visibilityState === "visible") {
        try {
          const res = await fetch("/api/live-quotes", { cache: "no-store" });
          if (res.ok) {
            const s = (await res.json()) as Status;
            if (stopped) return;
            setStatus(s);
            // someone else's poll may have fetched the quote, so compare asOf too
            const changed = s.updated.length > 0 || (seen.current !== null && s.asOf !== seen.current);
            seen.current = s.asOf;
            if (changed) router.refresh();
            if (s.polling) next = POLL_MS;
          }
        } catch {
          /* offline: try again on the next tick */
        }
      }
      if (!stopped) timer = setTimeout(poll, next);
    }

    function onVisible() {
      if (document.visibilityState === "visible") poll();
    }

    poll();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  if (!status?.ready) return null;

  if (!status.polling) {
    return (
      <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-line px-3 py-1 text-xs text-muted sm:self-auto">
        <span className="h-2 w-2 rounded-full bg-muted/60" />
        Market closed · last close
      </span>
    );
  }

  const time = status.asOf
    ? new Date(status.asOf).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : null;
  return (
    <span
      className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-pos/25 bg-pos-soft px-3 py-1 text-xs font-medium text-pos sm:self-auto"
      title="Quotes for the fund's holdings refresh about every 10 minutes while the market is open."
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-pos opacity-60 motion-safe:animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-pos" />
      </span>
      {time ? `Live · updated ${time}` : "Live"}
    </span>
  );
}
