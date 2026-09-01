import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getQuotes } from "@/lib/prices";
import { WATCHLIST } from "@/lib/tickers";
import { compactMoney, money2, signedPct } from "@/lib/format";
import { Card, PageHeader } from "@/components/ui";
import { TickerSearch } from "./TickerSearch";

const WATCH = WATCHLIST;

export default async function ResearchPage() {
  await requireUser();
  const quotes = await getQuotes(WATCH);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Research desk"
        description="Look up any stock or ETF — not just fund holdings. Nothing here implies a position; it's a scratchpad for evaluating ideas before they become proposals."
      />

      <div className="rounded-md border border-gold/30 bg-gold-soft px-4 py-2.5 text-xs text-gold">
        Research only. Nothing on this page is an Eagle Fund holding. Prices are the latest
        daily close, not intraday.
      </div>

      <Card className="p-5">
        <TickerSearch autoFocus />
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-tight text-ink">Quick look</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {WATCH.map((t) => {
            const q = quotes[t];
            return (
              <Link
                key={t}
                href={`/research/${t}`}
                className="rounded-lg border border-line bg-surface px-4 py-3 transition-colors hover:border-line-strong hover:bg-surface-2"
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold text-ink">{t}</span>
                  <span
                    className={`text-xs tnum ${q.changePct >= 0 ? "text-pos" : "text-neg"}`}
                  >
                    {signedPct(q.changePct)}
                  </span>
                </div>
                <p className="mt-1 truncate text-[11px] text-faint">{q.name}</p>
                <p className="mt-1 text-sm tnum text-muted">
                  {money2(q.price)} · {compactMoney(q.marketCap)}
                </p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
