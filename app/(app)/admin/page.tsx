import { requireAdvisor } from "@/lib/auth";
import { longDate, money, relativeTime } from "@/lib/format";
import { refreshPricesNow, toggleUserActive } from "@/app/actions/admin";
import { admin as sb } from "@/lib/supabase/admin";
import { getMeta, getSnapshots, getUsers } from "@/lib/store";
import { Badge, Card, CardHeader, PageHeader, SubmitButton } from "@/components/ui";
import { AddPmForm, ReturnsForm, SnapshotForm } from "./AdminForms";

export default async function AdminPage() {
  await requireAdvisor();
  const [users, snapshots, meta, priceMeta] = await Promise.all([
    getUsers(),
    getSnapshots(),
    getMeta(),
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
        description="Faculty only. Manage portfolio-manager accounts each semester and maintain the manually-entered fund figures."
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

      <Card>
        <CardHeader
          title="Overview figures"
          description="Trailing returns and the cash balance shown on the Overview page. These are not derived — enter them from the annual review."
        />
        <ReturnsForm
          fundTrailingReturnPct={meta.fundTrailingReturnPct}
          benchmarkTrailingReturnPct={meta.benchmarkTrailingReturnPct}
          cashBalance={meta.cashBalance}
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
          description="Daily closes from Twelve Data, cached in the database. A scheduled job tops these up hourly; this button refreshes the 6 most stale tickers now."
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
