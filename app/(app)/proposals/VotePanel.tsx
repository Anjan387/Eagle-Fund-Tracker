"use client";

import { castProposalVote } from "@/app/actions/proposals";
import { cn } from "@/components/ui";
import type { VoteChoice } from "@/lib/types";

export interface VoteView {
  voterId: string;
  voterName: string;
  vote: VoteChoice;
}

const VOTE_META: Record<VoteChoice, { label: string; tone: string; activeTone: string }> = {
  in_favor: {
    label: "In favor",
    tone: "border-line-strong text-muted hover:border-pos/40 hover:bg-pos-soft hover:text-pos",
    activeTone: "border-pos/40 bg-pos-soft text-pos",
  },
  against: {
    label: "Against",
    tone: "border-line-strong text-muted hover:border-neg/40 hover:bg-neg-soft hover:text-neg",
    activeTone: "border-neg/40 bg-neg-soft text-neg",
  },
  needs_review: {
    label: "Need to review",
    tone: "border-line-strong text-muted hover:border-warn/40 hover:bg-warn-soft hover:text-warn",
    activeTone: "border-warn/40 bg-warn-soft text-warn",
  },
};

const VOTE_ORDER: VoteChoice[] = ["in_favor", "against", "needs_review"];

export function VotePanel({
  proposalId,
  votes,
  currentUserId,
  canVote,
}: {
  proposalId: string;
  votes: VoteView[];
  currentUserId: string;
  canVote: boolean;
}) {
  const myVote = votes.find((v) => v.voterId === currentUserId)?.vote;
  const byChoice = (choice: VoteChoice) => votes.filter((v) => v.vote === choice);

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
      <div className="flex flex-wrap gap-2">
        {VOTE_ORDER.map((choice) => {
          const group = byChoice(choice);
          const meta = VOTE_META[choice];
          return (
            <div
              key={choice}
              className="flex min-w-0 flex-1 flex-col gap-1 rounded-md border border-line bg-surface-2 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-ink">{meta.label}</span>
                <span className="tnum text-xs text-faint">{group.length}</span>
              </div>
              {group.length > 0 ? (
                <p className="truncate text-[11px] text-faint" title={group.map((v) => v.voterName).join(", ")}>
                  {group.map((v) => v.voterName).join(", ")}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {canVote ? (
        <form action={castProposalVote} className="flex flex-wrap gap-2">
          <input type="hidden" name="proposalId" value={proposalId} />
          {VOTE_ORDER.map((choice) => (
            <button
              key={choice}
              type="submit"
              name="vote"
              value={choice}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                myVote === choice ? VOTE_META[choice].activeTone : VOTE_META[choice].tone,
              )}
            >
              {myVote === choice ? "✓ " : ""}
              {VOTE_META[choice].label}
            </button>
          ))}
        </form>
      ) : null}
    </div>
  );
}
