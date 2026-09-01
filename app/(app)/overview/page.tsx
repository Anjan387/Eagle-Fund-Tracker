import { getFundOverview } from "@/lib/fund";
import { money, money2, signedPct } from "@/lib/format";
import { AllocationBars } from "@/components/AllocationBars";
import { AumChart } from "@/components/charts/AumChart";
import { Card, CardHeader, PageHeader, StatTile } from "@/components/ui";

export default async function OverviewPage() {
  const o = await getFundOverview();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Overview"
        description="Live valuation of the shadow ledger against the fund's 80/20 ACWI/AGG benchmark. Trailing-return figures are entered manually from the annual review."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Fund value"
          value={money(o.fundValue)}
          sub={`${money(o.investedValue)} invested + ${money(o.cashBalance)} cash`}
        />
        <StatTile
          label="Trailing 12-mo return"
          value={signedPct(o.fundTrailingReturnPct)}
          tone={o.fundTrailingReturnPct >= 0 ? "pos" : "neg"}
        />
        <StatTile
          label="Benchmark (80/20)"
          value={signedPct(o.benchmarkTrailingReturnPct)}
          sub="ACWI / AGG"
        />
        <StatTile
          label="Outperformance"
          value={signedPct(o.outperformancePct)}
          tone={o.outperformancePct >= 0 ? "pos" : "neg"}
          sub="vs benchmark"
        />
      </div>

      <Card>
        <CardHeader
          title="Assets under management"
          description="2020–2025 year-end totals from the annual deck; the current year is a live estimate (holdings + cash)."
        />
        <div className="px-3 py-4">
          <AumChart data={o.aum} />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader
            title="Strategy allocation vs IPS targets"
            description="Blue band = IPS target range. Solid bar = current live weight."
          />
          <AllocationBars
            allocations={o.allocations}
            cashWeightPct={o.cashWeightPct}
            cashValue={o.cashBalance}
          />
        </Card>

        <Card>
          <CardHeader title="Unrealized P&L" description="Live market value vs recorded cost basis." />
          <div className="flex flex-col gap-4 px-5 py-5">
            <Row label="Cost basis of holdings" value={money2(o.totalCostBasis)} />
            <Row label="Market value of holdings" value={money2(o.investedValue)} />
            <div className="border-t border-line pt-4">
              <Row
                label="Unrealized gain / loss"
                value={`${o.totalGainAbs >= 0 ? "+" : ""}${money2(o.totalGainAbs)}  (${signedPct(
                  o.totalGainPct,
                )})`}
                tone={o.totalGainAbs >= 0 ? "pos" : "neg"}
              />
            </div>
            <p className="text-[11px] text-faint">
              Valued at the latest daily close from Twelve Data. Cost basis is the sum of
              recorded buy trades.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg";
}) {
  const toneClass = tone === "pos" ? "text-pos" : tone === "neg" ? "text-neg" : "text-ink";
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className={`tnum font-medium ${toneClass}`}>{value}</span>
    </div>
  );
}
