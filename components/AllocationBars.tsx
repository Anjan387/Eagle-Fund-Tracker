import { money } from "@/lib/format";
import type { StrategyAllocation } from "@/lib/fund";

// A bullet-graph pattern: a single status-colored fill (0 -> current weight)
// against a track, with the IPS target range marked by two boundary ticks
// drawn on top of everything - not a translucent band *under* the fill, which
// is what the old design did and why it was unreadable: the fill is solid and
// always starts at 0%, so any band it grows past gets silently painted over.
// Ticks don't have that problem - they're visible whether they land on the
// bare track or on the colored fill.

const SCALE_MAX = 40; // % — every row and the shared axis share this fixed scale
const AXIS_STEPS = [0, 10, 20, 30, 40];

type Tone = "pos" | "warn" | "neg";

const STATUS_META: Record<StrategyAllocation["status"], { tone: Tone; label: string }> = {
  "in-range": { tone: "pos", label: "In range" },
  under: { tone: "warn", label: "Below target" },
  over: { tone: "neg", label: "Above target" },
};

// Tailwind can't interpolate arbitrary class strings, so the tone -> class
// mapping has to be a lookup table of literal classes rather than a template.
const FILL_CLASS: Record<Tone, string> = { pos: "bg-pos", warn: "bg-warn", neg: "bg-neg" };
const TEXT_CLASS: Record<Tone, string> = { pos: "text-pos", warn: "text-warn", neg: "text-neg" };
const BADGE_CLASS: Record<Tone, string> = {
  pos: "border-pos/25 bg-pos-soft",
  warn: "border-warn/30 bg-warn-soft",
  neg: "border-neg/25 bg-neg-soft",
};

function toX(valuePct: number): number {
  return Math.min(Math.max((valuePct / SCALE_MAX) * 100, 0), 100);
}

export function AllocationBars({
  allocations,
  cashWeightPct,
  cashValue,
  fundValue,
}: {
  allocations: StrategyAllocation[];
  cashWeightPct: number;
  cashValue: number;
  fundValue: number;
}) {
  return (
    <div className="flex flex-col gap-5 px-5 py-5">
      {/* legend - the color-status mapping and the tick are never explained
          by color alone elsewhere, so spell them out once, up top */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted">
        <LegendDot tone="pos" label="In range" />
        <LegendDot tone="warn" label="Below target" />
        <LegendDot tone="neg" label="Above target" />
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-[3px] rounded-sm bg-ink/70" />
          IPS target range
        </span>
      </div>

      {allocations.map((a) => {
        const meta = STATUS_META[a.status];
        const minX = toX(a.strategy.targetMinPct);
        const maxX = toX(a.strategy.targetMaxPct);
        const fillX = toX(a.weightPct);

        let delta: string | null = null;
        if (a.status === "under") {
          const need = (a.strategy.targetMinPct / 100) * fundValue - a.marketValue;
          delta = `buy ~${money(need)} to reach ${a.strategy.targetMinPct}%`;
        } else if (a.status === "over") {
          const trim = a.marketValue - (a.strategy.targetMaxPct / 100) * fundValue;
          delta = `trim ~${money(trim)} to reach ${a.strategy.targetMaxPct}%`;
        }

        return (
          <div key={a.strategy.id}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium text-ink">{a.strategy.name}</span>
              <span className="tnum text-muted">
                {a.weightPct.toFixed(1)}% · {money(a.marketValue)}
              </span>
            </div>

            <div className="relative mt-3 h-2.5 rounded-full bg-surface-2">
              {/* target zone - a quiet tint, only ever visible in the portion
                  the fill hasn't reached; the ticks (below) carry the real
                  signal regardless of whether this shows */}
              <div
                className="absolute top-0 h-full rounded-full bg-line-strong/50"
                style={{ left: `${minX}%`, width: `${Math.max(maxX - minX, 0)}%` }}
              />
              {/* measure - color itself carries the status */}
              <div
                className={`absolute top-0 h-full rounded-full ${FILL_CLASS[meta.tone]}`}
                style={{ width: `${fillX}%` }}
              />
              <RangeTick x={minX} />
              <RangeTick x={maxX} />
            </div>

            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span className="text-[11px] text-faint">
                Target {a.strategy.targetMinPct}–{a.strategy.targetMaxPct}%
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${TEXT_CLASS[meta.tone]} ${BADGE_CLASS[meta.tone]}`}
              >
                {meta.label}
                {delta ? <span className="font-normal opacity-90">· {delta}</span> : null}
              </span>
            </div>
          </div>
        );
      })}

      {/* cash reserve - same track language, no IPS target to speak of */}
      <div className="border-t border-line pt-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium text-ink">Cash reserve</span>
          <span className="tnum text-muted">
            {cashWeightPct.toFixed(1)}% · {money(cashValue)}
          </span>
        </div>
        <div className="relative mt-3 h-2.5 rounded-full bg-surface-2">
          <div className="absolute top-0 h-full rounded-full bg-gold" style={{ width: `${toX(cashWeightPct)}%` }} />
        </div>
        <p className="mt-1.5 text-[11px] text-faint">Held aside for opportunities. Not an IPS strategy.</p>
      </div>

      {/* shared axis - every row above reads off this same 0-40% scale. Evenly
          spaced steps + justify-between lines up with the bars above without
          any absolute positioning that could clip the end labels. */}
      <div className="flex justify-between border-t border-line pt-1.5 text-[10px] tnum text-faint">
        {AXIS_STEPS.map((v) => (
          <span key={v}>{v}%</span>
        ))}
      </div>
    </div>
  );
}

function LegendDot({ tone, label }: { tone: Tone; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block h-2 w-2 rounded-full ${FILL_CLASS[tone]}`} />
      {label}
    </span>
  );
}

function RangeTick({ x }: { x: number }) {
  return (
    <div
      className="absolute -top-1 h-4 w-[3px] -translate-x-1/2 rounded-sm bg-ink/70 ring-2 ring-surface"
      style={{ left: `${x}%` }}
    />
  );
}
