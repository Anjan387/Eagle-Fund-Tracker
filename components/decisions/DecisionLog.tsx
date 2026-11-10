"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { cn, FieldError, PageHeader, SubmitButton } from "@/components/ui";
import type { Decision, DecisionDocument } from "@/lib/decision-types";
import { decisionsToCsv, downloadCsv } from "./csv";
import { DecisionDetail, type VoteTally } from "./DecisionDetail";
import { DecisionList } from "./DecisionList";
import type { ProposalOption, TradeOption } from "./Fields";
import { NewDecision } from "./NewDecision";
import { TabBar, type Tab } from "./Tabs";
import styles from "./decisions.module.css";

const LIST = "list";
const NEW = "new";
const PANEL = "decision-log-panel";

/**
 * The Decision Log: the list of decisions, plus every decision the reader has
 * opened, as tabs. Open tabs stay mounted while hidden, so half-made edits
 * survive switching between them.
 */
export function DecisionLog({
  decisions,
  documents,
  strategies,
  people,
  proposals,
  trades,
  proposalVotes,
  me,
}: {
  decisions: Decision[];
  documents: DecisionDocument[];
  strategies: { id: string; name: string }[];
  people: Record<string, string>;
  proposals: ProposalOption[];
  trades: TradeOption[];
  proposalVotes: Record<string, VoteTally>;
  me: { id: string; role: string };
}) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [active, setActive] = useState(LIST);
  const [notice, setNotice] = useState<string[]>([]);

  const refresh = () => startRefresh(() => router.refresh());
  const byId = new Map(decisions.map((d) => [d.id, d]));
  const open = openIds.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
  const options = { strategies, proposals, trades, decisions };
  const documentCount: Record<string, number> = {};
  for (const doc of documents) documentCount[doc.decisionId] = (documentCount[doc.decisionId] ?? 0) + 1;

  // a tab whose decision is gone (deleted elsewhere) falls back to the list
  const activeMissing = active !== LIST && active !== NEW && !byId.has(active);
  useEffect(() => {
    if (activeMissing && !refreshing) setActive(LIST);
  }, [activeMissing, refreshing]);

  function openDecision(id: string) {
    setOpenIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
    setActive(id);
  }
  function closeTab(id: string) {
    if (id === NEW) setCreating(false);
    else setOpenIds((ids) => ids.filter((x) => x !== id));
    if (active === id) setActive(LIST);
  }

  const tabs: Tab[] = [
    { id: LIST, label: "All decisions" },
    ...open.map((d) => ({ id: d.id, label: `${d.action === "buy" ? "Buy" : "Sell"} ${d.ticker}`, closable: true })),
    ...(creating ? [{ id: NEW, label: "New decision", closable: true }] : []),
  ];

  function exportCsv() {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(
      `eagle-fund-decision-log-${stamp}.csv`,
      decisionsToCsv(
        decisions,
        documents,
        (id) => strategies.find((s) => s.id === id)?.name ?? "",
        (id) => people[id ?? ""] ?? "",
      ),
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Decision Log"
        description="One folder for every buy or sell decision the fund makes: the thesis, the documents behind it, and a review of how it turned out."
        action={
          <div className="flex shrink-0 flex-wrap gap-2">
            <SubmitButton type="button" variant="ghost" onClick={exportCsv} disabled={decisions.length === 0}>
              Export CSV
            </SubmitButton>
            <SubmitButton
              type="button"
              onClick={() => {
                setCreating(true);
                setActive(NEW);
              }}
            >
              + New Decision
            </SubmitButton>
          </div>
        }
      />

      {notice.length ? (
        <FieldError>
          The decision was saved, but these documents did not upload. Add them again from its Documents tab.
          {notice.map((n) => (
            <span key={n} className="block">
              {n}
            </span>
          ))}
        </FieldError>
      ) : null}

      <div className="flex flex-col gap-4">
        <TabBar label="Open decisions" tabs={tabs} active={active} onSelect={setActive} onClose={closeTab} panelId={PANEL} />

        <div role="tabpanel" id={PANEL} aria-labelledby={`${PANEL}-tab-${active}`}>
          <div hidden={active !== LIST} className={cn(active === LIST && styles.panel)}>
            <DecisionList decisions={decisions} documentCount={documentCount} strategies={strategies} onOpen={openDecision} />
          </div>

          {open.map((d) => (
            <div key={d.id} hidden={active !== d.id} className={cn(active === d.id && styles.panel)}>
              <DecisionDetail
                decision={d}
                documents={documents.filter((doc) => doc.decisionId === d.id)}
                options={options}
                people={people}
                proposalVotes={proposalVotes}
                me={me}
                onOpen={openDecision}
                onDeleted={(id) => {
                  closeTab(id);
                  refresh();
                }}
                refresh={refresh}
              />
            </div>
          ))}

          {creating ? (
            <div hidden={active !== NEW} className={cn(active === NEW && styles.panel)}>
              <NewDecision
                options={options}
                onCancel={() => closeTab(NEW)}
                onCreated={(id, failed) => {
                  setCreating(false);
                  setNotice(failed);
                  openDecision(id);
                  refresh();
                }}
              />
            </div>
          ) : null}

          {activeMissing ? <p className="py-10 text-center text-sm text-muted">Opening…</p> : null}
        </div>
      </div>
    </div>
  );
}
