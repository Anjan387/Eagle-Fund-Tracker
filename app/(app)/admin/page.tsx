import { requireAdvisor } from "@/lib/auth";
import { longDate, money, money2, relativeTime } from "@/lib/format";
import { refreshPricesNow, toggleUserActive } from "@/app/actions/admin";
import { admin as sb } from "@/lib/supabase/admin";
import { getFundOverview } from "@/lib/fund";
import { getCashTransactions, getMeta, getSnapshots, getUsers } from "@/lib/store";
import { Badge, Card, CardHeader, PageHeader, SubmitButton } from "@/components/ui";
import { AddPmForm, CashEventForm, ReturnsForm, SnapshotForm } from "./AdminForms";

const CASH_KIND_LABEL: Record<string, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  dividend: "Dividend",
  fee: "Fee",
  adjustment: "Adjustment",
  trade_buy: "Trade (buy)",
  trade_sell: "Trade (sell)",
};

export default async function AdminPage() {
  await requireAdvisor();
  const [users, snapshots, meta, overview, cashTransactions, priceMeta] = await Promise.all([
    getUsers(),
    getSnapshots(),
    getMeta(),
    getFundOverview(),
    getCashTransactions(),
    sb()
      .from("price_cache")
      .select("ticker,date")
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const pms = users.filter((u) => u.role === "pm");
  const newestPrice = priceMeta.data?.date as string | undefined;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Admin"
        description="Faculty only. Manage portfolio-manager accounts each semester, log cash events, and review the automatically computed fund figures."
      />

      <Card>
        <CardHeader title="Add a portfolio manager" description="Create one account per PM at the start of the semester." />
        <AddPmForm />
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title={`Portfolio managers (${pms.length})`} description="Deactivate accounts when a PM finishes the course — their notes and proposals are kept." />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-faint">
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Added</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {pms.map((u) => (
                <tr key={u.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{u.name}</td>
                  <td className="px-4 py-3 tnum text-muted">{u.email}</td>
                  <td className="px-4 py-3 text-muted">{longDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={u.active ? "pos" : "neutral"}>{u.active ? "active" : "inactive"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={toggleUserActive}>
                      <input type="hidden" name="userId" value={u.id} />
                      <input type="hidden" name="active" value={u.active ? "false" : "true"} />
                      <button
                        type="submit"
                        className="rounded-md border border-line-strong px-2.5 py-1 text-xs text-muted hover:bg-surface-2 hover:text-ink"
                      >
                        {u.active ? "Deactivate" : "Reactivate"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader
          title="Cash"
          description={`Derived from the ledger below, not typed in — currently ${money(overview.cashBalance)}. Buys and sells post their own entries automatically; log deposits, dividends, and fees here as they happen.`}
        />
        <CashEventForm />
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-faint">
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Ticker</th>
                <th className="px-4 py-2.5 font-medium">Memo</th>
                <th className="px-4 py-2.5 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {cashTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted">
                    No cash events yet.
                  </td>
                </tr>
              ) : (
                cashTransactions.slice(0, 15).map((c) => (
                  <tr key={c.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 tnum text-muted">{longDate(c.occurredOn)}</td>
                    <td className="px-4 py-3 text-ink">{CASH_KIND_LABEL[c.kind] ?? c.kind}</td>
                    <td className="px-4 py-3 tnum text-muted">{c.ticker ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{c.memo ?? "—"}</td>
                    <td className={`px-4 py-3 text-right tnum font-medium ${c.amount >= 0 ? "text-pos" : "text-neg"}`}>
                      {c.amount >= 0 ? "+" : ""}
                      {money2(c.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="border-t border-line px-5 py-3 text-[11px] text-faint">
          Append-only, like Transactions — fix a mistake with an offsetting Adjustment entry.
        </p>
      </Card>

      <Card>
        <CardHeader
          title="Trailing returns"
          description="Computed automatically (see the basis noted under each figure). Leave the override blank to use the computed value, or set one to correct it without a code change."
        />
        <ReturnsForm
          fundTrailingReturnPct={overview.fundTrailingReturnPct}
          fundReturnBasis={overview.fundReturnBasis}
          fundOverridePct={meta.fundTrailingReturnOverridePct}
          benchmarkTrailingReturnPct={overview.benchmarkTrailingReturnPct}
          benchmarkReturnBasis={overview.benchmarkReturnBasis}
          benchmarkOverridePct={meta.benchmarkTrailingReturnOverridePct}
        />
      </Card>

      <Card>
        <CardHeader
          title="Yearly AUM snapshots"
          description="One number per year for the long-run chart. Entering a year that already exists overwrites it."
        />
        <SnapshotForm />
        <div className="border-t border-line px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {snapshots.map((s) => (
              <span
                key={s.year}
                className="rounded-md border border-line bg-surface-2 px-2.5 py-1 text-xs tnum text-muted"
              >
                {s.year}: {money(s.totalValue)}
              </span>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Market prices"
          description="Daily closes from Twelve Data, cached in the database. A scheduled job tops these up once a day; this button refreshes the 7 most stale tickers now."
        />
        <div className="flex flex-wrap items-center gap-4 px-5 py-5">
          <form action={refreshPricesNow}>
            <SubmitButton variant="ghost">Refresh prices now</SubmitButton>
          </form>
          <p className="text-xs text-muted">
            {newestPrice
              ? `Most recent cached close: ${longDate(newestPrice)} (${relativeTime(newestPrice)})`
              : "No prices cached yet — run this a few times, or hit /api/refresh-prices."}
          </p>
        </div>
      </Card>

      <p className="text-[11px] text-faint">
        To wipe the fund data and start over, re-run <code className="tnum">supabase/schema.sql</code>{" "}
        in the Supabase SQL editor.
      </p>
    </div>
  );
}
