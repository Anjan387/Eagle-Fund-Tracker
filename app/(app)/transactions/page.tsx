import { requireUser } from "@/lib/auth";
import { longDate, money, money2 } from "@/lib/format";
import { getProposals, getStrategies, getTrades, getUsers } from "@/lib/store";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { AddTradeForm } from "./AddTradeForm";

export default async function TransactionsPage() {
  const [user, trades, strategies, users, proposals] = await Promise.all([
    requireUser(),
    getTrades(),
    getStrategies(),
    getUsers(),
    getProposals(),
  ]);

  const stratName = new Map(strategies.map((s) => [s.id, s.name]));
  const userName = new Map(users.map((u) => [u.id, u.name]));
  const filledProposalIds = new Set(trades.map((t) => t.proposalId).filter(Boolean));
  const approvedUnfilled = proposals
    .filter((p) => p.status === "approved" && !filledProposalIds.has(p.id))
    .map((p) => ({ id: p.id, ticker: p.ticker, action: p.action, shares: p.shares, strategyId: p.strategyId }));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Transactions"
        description="Append-only trade log. Entries are never edited or deleted — if something was recorded wrong, the advisor corrects it with a new offsetting entry so the audit trail stays intact."
      />

      {user.role === "advisor" ? (
        <Card>
          <CardHeader
            title="Record an executed trade"
            description="Enter trades only once they have actually filled in the Schwab account."
          />
          <AddTradeForm strategies={strategies} approvedProposals={approvedUnfilled} />
        </Card>
      ) : (
        <p className="rounded-md border border-line bg-surface-2 px-4 py-3 text-xs text-muted">
          Read-only view. Only the faculty advisor records trades. To suggest one, use{" "}
          <span className="font-medium text-ink">Proposals</span>.
        </p>
      )}

      <Card className="overflow-hidden">
        <CardHeader title={`Trade log (${trades.length})`} description="Most recent first." />
        {trades.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No trades recorded yet" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-faint">
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium">Action</th>
                  <th className="px-4 py-2.5 font-medium">Ticker</th>
                  <th className="px-4 py-2.5 text-right font-medium">Shares</th>
                  <th className="px-4 py-2.5 text-right font-medium">Price</th>
                  <th className="px-4 py-2.5 text-right font-medium">Value</th>
                  <th className="px-4 py-2.5 font-medium">Strategy</th>
                  <th className="px-4 py-2.5 font-medium">Entered by</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t) => (
                  <tr key={t.id} className="border-b border-line last:border-0 align-top">
                    <td className="px-4 py-3 tnum whitespace-nowrap text-muted">
                      {longDate(t.tradeDate)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={t.action === "buy" ? "pos" : "neg"}>{t.action.toUpperCase()}</Badge>
                    </td>
                    <td className="px-4 py-3 font-semibold text-ink">{t.ticker}</td>
                    <td className="px-4 py-3 text-right tnum">{t.shares.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tnum">{money2(t.price)}</td>
                    <td className="px-4 py-3 text-right tnum">{money(t.shares * t.price)}</td>
                    <td className="px-4 py-3 text-muted">{stratName.get(t.strategyId)}</td>
                    <td className="px-4 py-3 text-muted">
                      {userName.get(t.enteredBy) ?? "—"}
                      <span className="block text-[11px] text-faint">
                        {t.source === "approved_proposal" ? "from proposal" : "advisor entry"}
                      </span>
                      {t.notes ? (
                        <span className="mt-1 block max-w-xs text-[11px] text-faint">{t.notes}</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
