import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getDecisionLog } from "@/lib/decisions";
import { getProposals, getStrategies, getTrades, getUsers, getVotesForProposal } from "@/lib/store";
import { Card, PageHeader } from "@/components/ui";
import { DecisionLog } from "@/components/decisions/DecisionLog";
import type { VoteTally } from "@/components/decisions/DecisionDetail";

// The fund's filing cabinet. Decisions and their document records live in the
// `decisions` and `decision_documents` tables; the files themselves are in the
// private "decision-documents" Storage bucket (see lib/decisions.ts).

export const metadata: Metadata = { title: "Decision Log · Eagle Fund" };

export default async function DecisionsPage() {
  const [user, log, strategies, users, proposals, trades] = await Promise.all([
    requireUser(),
    getDecisionLog(),
    getStrategies(),
    getUsers(),
    getProposals(),
    getTrades(),
  ]);

  if (!log.ready) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Decision Log"
          description="One folder for every buy or sell decision the fund makes: the thesis, the documents behind it, and a review of how it turned out."
        />
        <Card className="px-5 py-5">
          <p className="text-sm font-medium text-ink">One setup step is left</p>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            The Decision Log&apos;s tables don&apos;t exist yet. In the Supabase dashboard, open SQL Editor, start a new
            query, paste the contents of <code className="font-mono text-xs">supabase/migrations/006_decision_log.sql</code>{" "}
            and run it. Then reload this page.
          </p>
        </Card>
      </div>
    );
  }

  // votes are only needed for proposals a decision is linked to
  const linked = [...new Set(log.decisions.flatMap((d) => (d.proposalId ? [d.proposalId] : [])))];
  const proposalVotes: Record<string, VoteTally> = {};
  await Promise.all(
    linked.map(async (id) => {
      const votes = await getVotesForProposal(id);
      proposalVotes[id] = {
        inFavor: votes.filter((v) => v.vote === "in_favor").length,
        against: votes.filter((v) => v.vote === "against").length,
        needsReview: votes.filter((v) => v.vote === "needs_review").length,
      };
    }),
  );

  return (
    <DecisionLog
      decisions={log.decisions}
      documents={log.documents}
      strategies={strategies.map((s) => ({ id: s.id, name: s.name }))}
      people={Object.fromEntries(users.map((u) => [u.id, u.name]))}
      proposals={proposals.map((p) => ({
        id: p.id,
        ticker: p.ticker,
        action: p.action,
        shares: p.shares,
        strategyId: p.strategyId,
        status: p.status,
        createdAt: p.createdAt,
      }))}
      trades={trades.map((t) => ({
        id: t.id,
        ticker: t.ticker,
        action: t.action,
        shares: t.shares,
        price: t.price,
        tradeDate: t.tradeDate,
        strategyId: t.strategyId,
      }))}
      proposalVotes={proposalVotes}
      me={{ id: user.id, role: user.role }}
    />
  );
}
