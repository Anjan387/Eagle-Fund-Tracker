import { requireUser } from "@/lib/auth";
import { longDate, relativeTime } from "@/lib/format";
import { getProposals, getStrategies, getTrades, getUsers } from "@/lib/store";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import type { Proposal } from "@/lib/types";
import { NewProposalForm } from "./NewProposalForm";
import { ProposalDecision } from "./ProposalDecision";

const statusTone = {
  pending: "gold",
  approved: "pos",
  rejected: "neg",
} as const;

export default async function ProposalsPage() {
  const [user, proposals, strategies, users, trades] = await Promise.all([
    requireUser(),
    getProposals(),
    getStrategies(),
    getUsers(),
    getTrades(),
  ]);

  const stratName = new Map(strategies.map((s) => [s.id, s.name]));
  const userName = new Map(users.map((u) => [u.id, u.name]));
  const filledProposalIds = new Set(trades.map((t) => t.proposalId).filter(Boolean));

  const pending = proposals.filter((p) => p.status === "pending");
  const decided = proposals.filter((p) => p.status !== "pending");

  function Item({ p }: { p: Proposal }) {
    return (
      <Card className="px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-ink">
              {p.action.toUpperCase()} {p.shares.toLocaleString()} {p.ticker}
            </p>
            <p className="text-[11px] text-faint">
              {stratName.get(p.strategyId)} · by {userName.get(p.proposedBy) ?? "—"} ·{" "}
              {relativeTime(p.createdAt)}
            </p>
          </div>
          <Badge tone={statusTone[p.status]}>
            {p.status}
            {p.status === "approved"
              ? filledProposalIds.has(p.id)
                ? " · filled"
                : " · awaiting fill"
              : ""}
          </Badge>
        </div>

        <p className="mt-3 whitespace-pre-wrap text-sm text-muted">{p.rationale}</p>

        {p.status !== "pending" && p.decidedBy ? (
          <div className="mt-3 rounded-md border border-line bg-surface-2 px-3 py-2 text-xs text-muted">
            <span className="font-medium text-ink">
              {p.status === "approved" ? "Approved" : "Rejected"}
            </span>{" "}
            by {userName.get(p.decidedBy)} on {p.decidedAt ? longDate(p.decidedAt) : "—"}
            {p.decisionNote ? <p className="mt-1 whitespace-pre-wrap">{p.decisionNote}</p> : null}
          </div>
        ) : null}

        {user.role === "advisor" && p.status === "pending" ? (
          <ProposalDecision proposalId={p.id} />
        ) : null}
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Proposals"
        description={
          user.role === "advisor"
            ? "Review the queue. A proposal is intent, not execution — approving it does not create a trade."
            : "Suggest a buy or sell for the fund. The advisor brings it to a vote and records any resulting trade separately."
        }
      />

      {user.role === "pm" ? (
        <Card>
          <CardHeader title="New proposal" />
          <NewProposalForm strategies={strategies} />
        </Card>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-tight text-ink">
          Pending{pending.length ? ` (${pending.length})` : ""}
        </h2>
        {pending.length === 0 ? (
          <EmptyState title="Nothing awaiting a decision" />
        ) : (
          pending.map((p) => <Item key={p.id} p={p} />)
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-tight text-ink">Decided</h2>
        {decided.length === 0 ? (
          <EmptyState title="No decisions yet" />
        ) : (
          decided.map((p) => <Item key={p.id} p={p} />)
        )}
      </section>
    </div>
  );
}
