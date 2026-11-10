import { Badge } from "@/components/ui";
import { STATUS_LABEL, type DecisionAction, type DecisionStatus } from "@/lib/decision-types";

const STATUS_TONE = {
  draft: "neutral",
  pitched: "brand",
  approved: "gold",
  executed: "pos",
  rejected: "neg",
  closed: "neutral",
} as const;

export function ActionBadge({ action }: { action: DecisionAction }) {
  return (
    <Badge tone={action === "buy" ? "pos" : "neg"} className="font-semibold tracking-wide">
      {action === "buy" ? "BUY" : "SELL"}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: DecisionStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}
