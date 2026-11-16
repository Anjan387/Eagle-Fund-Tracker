// The Investment Policy Statement and AI use policy, as shown on the
// "IPS & AI Policy" page (app/(app)/ips/page.tsx). This is the whole text:
// edit it here and the page follows. Nothing else needs to change.
//
// Format, one item per line:
//   # Title            the page title (first) or the one-page summary (later one)
//   ## 7. Heading      a section; its number is used for the page's contents list
//   7.1 Text           a numbered clause
//   - item             a bullet
//   > Why: ...         the reason for a rule, shown as a "Why" note
//   | a | b | c        a table row (the first row is the header)
//   1. Text            a step in an ordered list (summary only)
//   **bold**           bold text
//   [TO DECIDE]        anything in square brackets is outlined as an open item
// Any other line is a paragraph.

export const IPS_TEXT = String.raw`
# Eagle Fund Investment Policy Statement
**DRAFT v0.1 for review and vote. Not in force until adopted.**
Outlined items are still to be decided. A "Why" note gives the reason for a rule, so people who were not here can judge whether it still fits. Cite sections as "per IPS 7.4".
## 1. Purpose and scope
1.1 This IPS says how the Eagle Fund chooses investments, places trades, measures results, and hands its work to the next class.
1.2 It applies to every member, to the faculty advisor, and to every account that holds fund assets. The fund is student-managed, holds roughly $300K, and is held at Charles Schwab [TO DECIDE].
1.3 The fund runs through the Portfolio Management course under faculty advisor Dr. Brad Andrew. Any board, committee or college office with authority over the fund: [TO DECIDE].
1.4 If this IPS conflicts with a college rule or the law, the college rule or the law wins.
> Why: a written policy lets someone who was not in the room make the same decision the founders would have.
## 2. Roles and responsibilities
2.1 **Faculty advisor.** Approves or rejects every trade. Keeps the final say on this IPS.
2.2 **Portfolio managers (PMs).** Enrolled students. Vote on pitches and on changes to this IPS.
2.3 **Analysts.** Research securities and write pitches. An analyst may also be a PM.
2.4 **Sleeve leads.** One per sleeve. Keep the sleeve inside its range (Section 5) and bring rebalancing proposals (Section 6).
2.5 **Risk and compliance officer.** A student, named each term, who checks trades and limits against this IPS and reports breaches. Whether to create this role: [TO DECIDE].
2.6 **Records keeper.** A student, named each term, who keeps the fund's records complete and up to date.
> Why: every duty has a named person, so nothing depends on someone remembering to do it.
## 3. Investment objectives
3.1 **Return.** [TO DECIDE]. It must be a number, measured net of costs, against the benchmark in 5.1, over a stated period.
3.2 **Risk.** [TO DECIDE]. It must be a number: a maximum drawdown, a tracking error limit, or a volatility limit.
> Why: an objective that cannot be measured cannot be missed, so it cannot guide a decision.
## 4. Constraints
4.1 **Liquidity.** Cash floor and any yearly payment to the college or a scholarship: [TO DECIDE].
4.2 **Time horizon.** [TO DECIDE].
4.3 **Legal and college rules.** No trading on non-public information. A member who owns a security, or has a personal interest in it, discloses this before pitching or voting on it and does not vote on it.
4.4 **Instruments.** Leverage, short selling and options held directly: [TO DECIDE]. The fund already holds funds that use options or futures inside them, so the rule must say whether those are allowed.
4.5 **Restricted securities, ESG screens, position, sector and single-stock caps:** [TO DECIDE].
> Why: constraints are the limits no pitch, however good, can override.
## 5. Strategic asset allocation and sleeves
5.1 **Benchmark.** 80% MSCI ACWI and 20% Bloomberg US Aggregate Bond Index, tracked in the fund's tracker with the ACWI and AGG ETFs as stand-ins. The benchmark changes only by amending this IPS.
5.2 **Sleeves.** The fund has four sleeves: VPIS, MOM, BHAC and HE. There is no AW sleeve. If a fifth is wanted, that is an amendment to this IPS.
| Sleeve | What it does | Target weight | Allowed range |
| VPIS | [TO DECIDE] | [TO DECIDE] | [TO DECIDE] |
| MOM | [TO DECIDE] | [TO DECIDE] | [TO DECIDE] |
| BHAC | [TO DECIDE] | [TO DECIDE] | [TO DECIDE] |
| HE | [TO DECIDE] | [TO DECIDE] | [TO DECIDE] |
5.3 Weights are measured on total fund value, including cash.
> Why: ranges, not single points, so normal price moves do not force trades.
## 6. Rebalancing
6.1 **Calendar.** Sleeve weights are checked [TO DECIDE].
6.2 **Trigger.** A sleeve outside its range starts a rebalancing review within [TO DECIDE] business days.
6.3 A rebalancing trade goes through the same pitch, vote and approval steps as any other trade (Section 7). It is never exempt.
> Why: rebalancing involves several trades at once, which is where mistakes are most costly.
## 7. Security selection
7.1 **A pitch must contain:** the thesis (why this security, why now, why this sleeve); a valuation (method, intrinsic value, price target, margin of safety); the key catalysts; the key risks; exit criteria (what would make us sell or reverse); the proposed size as a share of the fund; and a check against Sections 4 and 8.
7.2 Every pitch is filed in the Decision Log with its supporting documents and its AI use statement (10.5).
7.3 **Notice.** A pitch is shared with all PMs at least [TO DECIDE] before the vote.
7.4 **Vote.** Each PM votes for, against, or needs-review. Quorum and the share needed to pass: [TO DECIDE]. A member with a conflict under 4.3 does not vote.
7.5 **Approval.** A passed vote goes to the faculty advisor. A trade needs both the vote and the advisor's approval. Neither one alone is enough.
7.6 Sells follow the same path. A sell is linked to the buy it closes.
7.7 A rejected pitch is recorded with the reason.
> Why: two independent checks, one by peers and one by the advisor, catch different mistakes.
## 8. Risk management
8.1 **Position limit.** [TO DECIDE].
8.2 **Concentration limits** (sector, single stock, sleeve): [TO DECIDE].
8.3 **Review trigger.** A position that falls [TO DECIDE] from cost or from its peak gets a written review pitch within [TO DECIDE]. The review decides hold, add or sell. The drop does not sell anything automatically.
8.4 **Cash floor.** [TO DECIDE].
8.5 **Fund-level trigger.** If the fund reaches the drawdown in 3.2, the advisor and PMs meet and decide what to do.
8.6 The risk officer reports any breach to the advisor within the same week.
> Why: review triggers prompt thought without forcing a sale at the worst time.
## 9. Performance measurement
9.1 Compare with the benchmark in 5.1.
9.2 Use time-weighted returns, net of costs, so deposits and withdrawals do not distort them.
9.3 Break down results by sleeve: each sleeve's contribution to fund return and to the gap versus benchmark.
9.4 Schwab statements are the official record. The tracker is the working copy, and it is reconciled to the statements every month.
> Why: results are judged on one method that every class can repeat.
## 10. Use of AI tools
10.1 **Scope.** Any AI tool (chat assistants, coding tools, AI features in other software) used for fund work.
10.2 **Permitted uses.**
- (a) Summarizing public filings, earnings calls and articles, then checking the summary (10.4)
- (b) Drafting or editing memos from the member's own analysis
- (c) Building and debugging spreadsheets and code, with the logic reviewed by a person
- (d) Checking calculations, as a second check and never the only one
- (e) Explaining concepts and suggesting questions to research
10.3 **Prohibited uses.**
- (a) Letting AI decide whether, what, when or how much to buy or sell, or treating its answer as a vote
- (b) Giving AI any brokerage login, trading access or ability to place orders
- (c) Giving AI the tracker's database keys or other fund system credentials: [TO DECIDE]
- (d) Entering personal information, student records, account numbers, passwords, or non-public information about any company
- (e) Presenting AI output as your own original analysis
10.4 **Verification rule.** Every number, fact, quote and source from an AI tool is checked against a primary source (10-K, 10-Q, 8-K, earnings release, Schwab data) before it goes into a pitch or report. A source an AI names does not count until the member has opened it and found the claim in it. A model's key outputs are recalculated by hand or in a separate tool. Anything not verified is removed or marked "unverified". The pitch records where each key figure was checked.
10.5 **Disclosure.** Every pitch and report ends with an AI use statement: which tool, what it was used for, and what was verified and by whom. Example: "AI use: [tool name] drafted the summary of the 10-K business section. I verified every figure against the 10-K (pp. 12-18)." If no AI was used, say so.
10.6 **Data and privacy.** Approved tools and the fund data each may receive: [TO DECIDE]. Until that is decided, enter only public information.
10.7 **Accountability.** The member who submits the work is responsible for it, including every error an AI tool introduced. "The tool said so" is not a defense.
10.8 **Academic integrity.** Juniata College's policy applies to course work and to fund work. Policy text: [TO DECIDE]. Where this section is stricter, this section applies.
10.9 **Review.** This section is reviewed at the start of each term [TO DECIDE], and any time a tool changes its data terms or a member proposes a change.
> Why: AI tools are fast and sometimes wrong in convincing ways. The rules keep a person responsible for every claim and every trade.
## Approval record
Adopted on [DATE] by a vote of [FOR] to [AGAINST] with [ABSTAIN] abstaining. Faculty advisor approval: [SIGNATURE, DATE].
# One-page summary for new members
**What this is.** The Eagle Fund is about $300K of Juniata College money. You may help run it. The rules protect it. The sections cited hold the full text.
**The fund.** Benchmark: 80% global stocks (ACWI), 20% US bonds (AGG). Four sleeves: VPIS, MOM, BHAC, HE. Each has a target and a range (5.2).
**How a trade happens.**
1. An analyst writes a pitch: thesis, valuation, risks, exit criteria (7.1).
2. The pitch is filed in the Decision Log (7.2).
3. PMs vote (7.4).
4. The faculty advisor approves or rejects (7.5).
**The rule behind it all.** A trade needs both a PM vote and the advisor's approval. Neither one alone is enough (7.5).
**What you must never do.** Trade on your own. Vote on a security you own (4.3).
**Using AI.** Allowed for summaries, drafts, models, code and a second check (10.2). Never to decide a trade, never with brokerage access or non-public information (10.3). Check every number against a primary source (10.4). End every pitch with an AI use statement (10.5). You are responsible for what you submit (10.7).
**Your first week.** Read Sections 7 and 10. Look at three past decisions in the Decision Log.
**Where decisions live.** Every pitch, vote, trade and review is kept in the Decision Log so the next class can see why.
`;

// The headline facts shown under the page title. These repeat what the text
// above says, so change them here when the text changes.
export const IPS_FACTS: { label: string; value: string; note?: string }[] = [
  { label: "Fund size", value: "~$300K", note: "Juniata College assets" },
  { label: "Benchmark", value: "80 / 20", note: "MSCI ACWI / Bloomberg US Agg" },
  { label: "Sleeves", value: "4", note: "VPIS · MOM · BHAC · HE" },
  { label: "Faculty advisor", value: "Dr. Brad Andrew", note: "Final say on every trade" },
];
