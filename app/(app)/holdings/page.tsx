import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getHoldingRows } from "@/lib/fund";
import { longDate, money, money2, signedPct } from "@/lib/format";
import { getNotesForHolding, getStrategies, getUsers } from "@/lib/store";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { StockSearch } from "@/components/StockSearch";
import { HoldingNotes, type NoteView } from "./HoldingNotes";

export default async function HoldingsPage() {
  const [user, rows, strategies, users] = await Promise.all([
    requireUser(),
    getHoldingRows(),
    getStrategies(),
    getUsers(),
  ]);
  const userName = new Map(users.map((u) => [u.id, u.name]));

  const notesByHolding = new Map<string, NoteView[]>();
  await Promise.all(
    rows.map(async (r) => {
      const notes = await getNotesForHolding(r.id);
      notesByHolding.set(
        r.id,
        notes.map((n) => ({
          id: n.id,
          body: n.body,
          authorId: n.author,
          authorName: userName.get(n.author) ?? "Unknown",
          updatedAt: n.updatedAt,
        })),
      );
    }),
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Holdings"
        description="Open positions in the shadow ledger, grouped by strategy and priced with the mock market-data service. Any PM can attach a thesis note."
      />

      <Card className="p-5">
        <StockSearch placeholder="Look up any company or ticker — not just fund holdings" />
      </Card>

      {strategies.map((strategy) => {
        const stratRows = rows.filter((r) => r.strategyId === strategy.id);
        if (stratRows.length === 0) return null;
        const stratValue = stratRows.reduce((s, r) => s + r.marketValue, 0);

        return (
          <section key={strategy.id} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold tracking-tight text-ink">{strategy.name}</h2>
              <p className="text-xs text-muted tnum">
                {money(stratValue)} · target {strategy.targetMinPct}–{strategy.targetMaxPct}%
              </p>
            </div>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-faint">
                      <th className="px-4 py-2.5 font-medium">Ticker</th>
                      <th className="px-4 py-2.5 text-right font-medium">Shares</th>
                      <th className="px-4 py-2.5 text-right font-medium">Price</th>
                      <th className="px-4 py-2.5 text-right font-medium">Mkt value</th>
                      <th className="px-4 py-2.5 text-right font-medium">Cost basis</th>
                      <th className="px-4 py-2.5 text-right font-medium">Unrealized</th>
                      <th className="px-4 py-2.5 text-right font-medium">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stratRows.map((r) => (
                      <tr key={r.id} className="border-b border-line last:border-0 align-top">
                        <td className="px-4 py-3">
                          <Link
                            href={`/research/${r.ticker}`}
                            className="font-semibold text-brand hover:underline"
                          >
                            {r.ticker}
                          </Link>
                          <p className="text-[11px] text-faint">since {longDate(r.openedDate)}</p>
                        </td>
                        <td className="px-4 py-3 text-right tnum">{r.shares.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right tnum">
                          {money2(r.price)}
                          <span
                            className={`ml-1 text-[11px] ${r.changePct >= 0 ? "text-pos" : "text-neg"}`}
                          >
                            {signedPct(r.changePct)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tnum">{money(r.marketValue)}</td>
                        <td className="px-4 py-3 text-right tnum text-muted">{money(r.costBasis)}</td>
                        <td className="px-4 py-3 text-right tnum">
                          <span className={r.gainAbs >= 0 ? "text-pos" : "text-neg"}>
                            {r.gainAbs >= 0 ? "+" : ""}
                            {money(r.gainAbs)}
                          </span>
                          <span className="ml-1 text-[11px] text-faint">{signedPct(r.gainPct)}</span>
                        </td>
                        <td className="px-4 py-3 text-right tnum">{r.weightPct.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="grid gap-3 lg:grid-cols-2">
              {stratRows.map((r) => (
                <Card key={r.id} className="px-4 py-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-ink">
                      {r.ticker} · thesis notes
                    </span>
                    <Badge tone={r.gainAbs >= 0 ? "pos" : "neg"}>{signedPct(r.gainPct)}</Badge>
                  </div>
                  <HoldingNotes
                    holdingId={r.id}
                    notes={notesByHolding.get(r.id) ?? []}
                    currentUserId={user.id}
                    canModerate={user.role === "advisor"}
                  />
                </Card>
              ))}
            </div>
          </section>
        );
      })}

      {rows.length === 0 ? (
        <EmptyState title="No open holdings" hint="The advisor records the first trades on the Transactions page." />
      ) : null}
    </div>
  );
}
