import { money, signedPct } from "@/lib/format";
import { Badge } from "@/components/ui";
import type { StrategyAllocation } from "@/lib/fund";

const SCALE_MAX = 40; // % — bars are drawn against a fixed 0–40% axis

export function AllocationBars({
  allocations,
  cashWeightPct,
  cashValue,
}: {
  allocations: StrategyAllocation[];
  cashWeightPct: number;
  cashValue: number;
}) {
  return (
    <div className="flex flex-col gap-5 px-5 py-5">
      {allocations.map((a) => {
        const left = (a.strategy.targetMinPct / SCALE_MAX) * 100;
        const width = ((a.strategy.targetMaxPct - a.strategy.targetMinPct) / SCALE_MAX) * 100;
        const marker = Math.min((a.weightPct / SCALE_MAX) * 100, 100);
        const tone =
          a.status === "in-range" ? "pos" : a.status === "under" ? "warn" : "neg";
        const label =
          a.status === "in-range" ? "In range" : a.status === "under" ? "Below target" : "Above target";

        return (
          <div key={a.strategy.id}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium text-ink">{a.strategy.name}</span>
              <span className="tnum text-muted">
                {a.weightPct.toFixed(1)}% · {money(a.marketValue)}
              </span>
            </div>
            <div className="relative mt-2 h-2.5 rounded-full bg-surface-2">
              {/* IPS target band */}
              <div
                className="absolute top-0 h-full rounded-full bg-brand/15"
                style={{ left: `${left}%`, width: `${width}%` }}
              />
              {/* actual weight */}
              <div
                className="absolute top-0 h-full rounded-full bg-brand"
                style={{ width: `${marker}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-faint">
              <span>
                Target {a.strategy.targetMinPct}–{a.strategy.targetMaxPct}%
              </span>
              <Badge tone={tone}>
                {label}
                {a.status !== "in-range"
                  ? ` (${signedPct(
                      a.status === "under"
                        ? a.weightPct - a.strategy.targetMinPct
                        : a.weightPct - a.strategy.targetMaxPct,
                    )})`
                  : ""}
              </Badge>
            </div>
          </div>
        );
      })}

      <div className="border-t border-line pt-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium text-ink">Cash reserve</span>
          <span className="tnum text-muted">
            {cashWeightPct.toFixed(1)}% · {money(cashValue)}
          </span>
        </div>
        <div className="relative mt-2 h-2.5 rounded-full bg-surface-2">
          <div
            className="absolute top-0 h-full rounded-full bg-gold"
            style={{ width: `${Math.min((cashWeightPct / SCALE_MAX) * 100, 100)}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-faint">
          Held aside for Value opportunities. Not an IPS strategy.
        </p>
      </div>
    </div>
  );
}
