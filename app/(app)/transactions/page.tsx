import { requireUser } from "@/lib/auth";
import { knownCompanyName } from "@/lib/prices";
import { getProposals, getStrategies, getTrades, getUsers } from "@/lib/store";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { AddTradeForm } from "./AddTradeForm";
import { TradeLog } from "./TradeLog";

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

      <TradeLog
        strategies={strategies.map((st) => ({ id: st.id, name: st.name }))}
        rows={trades.map((t) => ({
          id: t.id,
          date: t.tradeDate,
          action: t.action,
          ticker: t.ticker,
          company: knownCompanyName(t.ticker),
          shares: t.shares,
          price: t.price,
          strategyId: t.strategyId,
          strategy: stratName.get(t.strategyId) ?? "",
          enteredBy: userName.get(t.enteredBy) ?? "—",
          fromProposal: t.source === "approved_proposal",
          notes: t.notes ?? null,
        }))}
      />
    </div>
  );
}
