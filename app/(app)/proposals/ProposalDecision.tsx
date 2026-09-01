import { resolveProposal } from "@/app/actions/proposals";
import { cn, inputClass } from "@/components/ui";

export function ProposalDecision({ proposalId }: { proposalId: string }) {
  return (
    <form action={resolveProposal} className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
      <input type="hidden" name="proposalId" value={proposalId} />
      <textarea
        name="decisionNote"
        rows={2}
        placeholder="Decision note (vote count, conditions, why rejected)…"
        className={cn(inputClass, "resize-y text-xs")}
      />
      <div className="flex gap-2">
        <button
          type="submit"
          name="decision"
          value="approved"
          className="rounded-md bg-pos px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
        >
          Approve
        </button>
        <button
          type="submit"
          name="decision"
          value="rejected"
          className="rounded-md border border-neg/30 bg-neg-soft px-3 py-1.5 text-xs font-medium text-neg hover:bg-neg/15"
        >
          Reject
        </button>
      </div>
      <p className="text-[11px] text-faint">
        Approving does not create a trade. Record the fill on Transactions once it executes.
      </p>
    </form>
  );
}
