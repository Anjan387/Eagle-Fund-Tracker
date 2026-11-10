"use client";

import { useEffect, useState } from "react";
import { cn, EmptyState, inputClass } from "@/components/ui";
import { longDate } from "@/lib/format";
import {
  DECISION_STATUSES,
  semesterOf,
  STATUS_LABEL,
  type Decision,
  type DecisionAction,
  type DecisionStatus,
} from "@/lib/decision-types";
import { ActionBadge, StatusBadge } from "./Badges";
import styles from "./decisions.module.css";

const VIEW_KEY = "eft-decisions-view";

/** Every decision, newest first, with search, filters, and a folder-grid or table view. */
export function DecisionList({
  decisions,
  documentCount,
  strategies,
  onOpen,
}: {
  decisions: Decision[];
  documentCount: Record<string, number>;
  strategies: { id: string; name: string }[];
  onOpen: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [action, setAction] = useState<DecisionAction | "">("");
  const [sleeve, setSleeve] = useState("");
  const [status, setStatus] = useState<DecisionStatus | "">("");
  const [semester, setSemester] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [view, setView] = useState<"grid" | "table">("grid");

  useEffect(() => {
    try {
      if (localStorage.getItem(VIEW_KEY) === "table") setView("table");
    } catch {
      /* no storage: the grid is fine */
    }
  }, []);
  function chooseView(next: "grid" | "table") {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* ignore */
    }
  }

  const sleeveName = (id: string | null) => strategies.find((s) => s.id === id)?.name ?? "No sleeve";
  const semesters = [...new Set(decisions.map((d) => semesterOf(d.decisionDate)))];
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);

  const shown = decisions.filter((d) => {
    if (action && d.action !== action) return false;
    if (sleeve && d.strategyId !== sleeve) return false;
    if (status && d.status !== status) return false;
    if (semester && semesterOf(d.decisionDate) !== semester) return false;
    if (from && d.decisionDate < from) return false;
    if (to && d.decisionDate > to) return false;
    if (words.length === 0) return true;
    const haystack = `${d.ticker} ${d.companyName ?? ""} ${d.thesisSummary} ${d.thesisText} ${d.analysts ?? ""}`.toLowerCase();
    return words.every((w) => haystack.includes(w));
  });
  const filtered = !!(query || action || sleeve || status || semester || from || to);

  function clear() {
    setQuery("");
    setAction("");
    setSleeve("");
    setStatus("");
    setSemester("");
    setFrom("");
    setTo("");
  }

  const select = cn(inputClass, "w-auto py-1.5 text-xs");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Search decisions</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ticker, company, or words in the thesis"
              className={inputClass}
            />
          </label>
          <div role="group" aria-label="View" className="flex shrink-0 gap-1 self-start rounded-md border border-line bg-surface-2 p-0.5">
            {(["grid", "table"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => chooseView(v)}
                className={cn(
                  "rounded px-3 py-1.5 text-xs transition-colors",
                  view === v ? "bg-surface font-medium text-brand shadow-sm" : "text-muted hover:text-ink",
                )}
              >
                {v === "grid" ? "Folders" : "Table"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-x-3 gap-y-2 text-xs text-muted">
          <label className="flex flex-col gap-1">
            Buy / Sell
            <select value={action} onChange={(e) => setAction(e.target.value as DecisionAction | "")} className={select}>
              <option value="">Both</option>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Sleeve
            <select value={sleeve} onChange={(e) => setSleeve(e.target.value)} className={select}>
              <option value="">All sleeves</option>
              {strategies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value as DecisionStatus | "")} className={select}>
              <option value="">Any status</option>
              {DECISION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Semester
            <select value={semester} onChange={(e) => setSemester(e.target.value)} className={select}>
              <option value="">All semesters</option>
              {semesters.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            From
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={select} />
          </label>
          <label className="flex flex-col gap-1">
            To
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={select} />
          </label>
          {filtered ? (
            <button type="button" onClick={clear} className="py-1.5 font-medium text-brand hover:underline">
              Clear filters
            </button>
          ) : null}
        </div>
      </div>

      <p aria-live="polite" className="text-xs text-muted">
        {shown.length === decisions.length
          ? `${decisions.length} ${decisions.length === 1 ? "decision" : "decisions"}`
          : `${shown.length} of ${decisions.length} decisions`}
      </p>

      {shown.length === 0 ? (
        <EmptyState
          title={decisions.length === 0 ? "No decisions filed yet" : "No decisions match"}
          hint={decisions.length === 0 ? "Use “New decision” to file the first one." : "Try fewer words or clear the filters."}
        />
      ) : view === "grid" ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => onOpen(d.id)}
                className={cn(styles.folder, "group block h-[calc(100%-0.75rem)] w-full text-left")}
              >
                <span
                  className={cn(
                    "flex h-full flex-col rounded-lg rounded-tl-none border border-l-4 border-line bg-surface p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow group-hover:shadow-md",
                    d.action === "buy" ? "border-l-pos" : "border-l-neg",
                  )}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-base font-semibold text-ink">{d.ticker}</span>
                    <ActionBadge action={d.action} />
                    <StatusBadge status={d.status} />
                  </span>
                  <span className="mt-1 block truncate text-sm text-muted">{d.companyName ?? "—"}</span>
                  <span className="mt-3 line-clamp-2 block text-sm text-ink">{d.thesisSummary}</span>
                  <span className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-4 text-[11px] text-faint">
                    <span>
                      {longDate(d.decisionDate)} · {sleeveName(d.strategyId)}
                    </span>
                    <span>
                      {documentCount[d.id] ?? 0} {documentCount[d.id] === 1 ? "document" : "documents"}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        // w-0 + min-w-full: a wide table scrolls inside the page instead of stretching it
        <div className="w-0 min-w-full overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="border-b border-line text-[11px] uppercase tracking-wide text-faint">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">Date</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Ticker</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Action</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Sleeve</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Thesis summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shown.map((d) => (
                <tr key={d.id} onClick={() => onOpen(d.id)} className="cursor-pointer hover:bg-surface-2">
                  <td className="whitespace-nowrap px-4 py-3 text-muted tnum">{longDate(d.decisionDate)}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpen(d.id);
                      }}
                      className="text-left hover:underline"
                    >
                      <span className="font-mono font-semibold text-ink">{d.ticker}</span>
                      <span className="block max-w-[14rem] truncate text-xs text-muted">{d.companyName ?? "—"}</span>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <ActionBadge action={d.action} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">{sleeveName(d.strategyId)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="max-w-[22rem] px-4 py-3 text-ink">
                    <span className="line-clamp-2">{d.thesisSummary}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
