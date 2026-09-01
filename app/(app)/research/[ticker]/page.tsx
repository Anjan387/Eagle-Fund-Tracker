import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getHistory, getNews, getQuote, isKnownTicker } from "@/lib/prices";
import { compactMoney, money2, relativeTime, signedPct } from "@/lib/format";
import { getHoldings, getStrategies } from "@/lib/store";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui";
import { PriceChart } from "@/components/charts/PriceChart";
import { TickerSearch } from "../TickerSearch";

export default async function TickerPage({ params }: PageProps<"/research/[ticker]">) {
  await requireUser();
  const { ticker: raw } = await params;
  const ticker = raw.toUpperCase();

  const [quote, history, news, holdings, strategies] = await Promise.all([
    getQuote(ticker),
    getHistory(ticker),
    getNews(ticker),
    getHoldings(),
    getStrategies(),
  ]);

  const ownedIn = holdings
    .filter((h) => h.ticker === ticker)
    .map((h) => strategies.find((s) => s.id === h.strategyId)?.name)
    .filter(Boolean);

  const range52 = quote.yearHigh - quote.yearLow;
  const pos52 = range52 > 0 ? ((quote.price - quote.yearLow) / range52) * 100 : 50;

  return (
    <div className="flex flex-col gap-7">
      <div className="flex items-center gap-2 text-xs text-muted">
        <Link href="/research" className="hover:text-ink">
          Research desk
        </Link>
        <span>/</span>
        <span className="text-ink">{ticker}</span>
      </div>

      <PageHeader
        title={`${ticker} · ${quote.name}`}
        description={
          isKnownTicker(ticker)
            ? undefined
            : "Unrecognized ticker — showing generated placeholder data so the page still renders."
        }
        action={
          <div className="w-full sm:w-80">
            <TickerSearch />
          </div>
        }
      />

      {ownedIn.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-brand/25 bg-brand/10 px-4 py-2.5 text-xs text-brand">
          <span className="font-medium">The Eagle Fund holds this.</span>
          <span>Strategy: {ownedIn.join(", ")}.</span>
          <Link href="/holdings" className="underline">
            View in Holdings
          </Link>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader
            title="Price"
            description="Daily closes from Twelve Data, cached each day."
            action={
              <div className="text-right">
                <p className="text-lg font-semibold tnum text-ink">{money2(quote.price)}</p>
                <p
                  className={`text-xs tnum ${quote.changeAbs >= 0 ? "text-pos" : "text-neg"}`}
                >
                  {quote.changeAbs >= 0 ? "+" : ""}
                  {money2(quote.changeAbs)} ({signedPct(quote.changePct)})
                </p>
              </div>
            }
          />
          <div className="px-4 py-4">
            <PriceChart history={history} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Key stats" />
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-5 text-sm">
            <Stat label="Previous close" value={money2(quote.previousClose)} />
            <Stat label="Day range" value={`${money2(quote.dayLow)} – ${money2(quote.dayHigh)}`} />
            <Stat label="52-wk low" value={money2(quote.yearLow)} />
            <Stat label="52-wk high" value={money2(quote.yearHigh)} />
            <Stat label="Market cap" value={compactMoney(quote.marketCap)} />
            <Stat label="P/E ratio" value={quote.peRatio ? quote.peRatio.toFixed(1) : "—"} />
            <Stat
              label="Dividend yield"
              value={quote.dividendYield ? `${(quote.dividendYield * 100).toFixed(2)}%` : "—"}
            />
            <Stat label="As of" value={new Date(quote.asOf).toLocaleDateString("en-US")} />
          </dl>
          <div className="px-5 pb-5">
            <div className="mb-1 flex justify-between text-[11px] text-faint">
              <span>52-week range</span>
              <span>{pos52.toFixed(0)}% of range</span>
            </div>
            <div className="relative h-2 rounded-full bg-surface-2">
              <div
                className="absolute -top-1 h-4 w-1 -translate-x-1/2 rounded bg-brand"
                style={{ left: `${Math.min(Math.max(pos52, 0), 100)}%` }}
              />
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Recent news" />
        {news.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted">
            No headlines available for this ticker on the current data plan.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {news.map((n) => (
              <li key={n.id} className="flex items-start justify-between gap-4 px-5 py-3.5">
                <div>
                  {n.url && n.url !== "#" ? (
                    <a
                      href={n.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-ink hover:text-brand hover:underline"
                    >
                      {n.headline}
                    </a>
                  ) : (
                    <p className="text-sm text-ink">{n.headline}</p>
                  )}
                  <p className="mt-0.5 text-[11px] text-faint">
                    {n.source} · {relativeTime(n.publishedAt)}
                  </p>
                </div>
                <Badge tone="neutral">news</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="text-[11px] text-faint">
        Prices and history from Twelve Data (daily close, cached). Market cap, P/E and yield are
        reference figures where shown.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-faint">{label}</dt>
      <dd className="mt-0.5 tnum text-ink">{value}</dd>
    </div>
  );
}
