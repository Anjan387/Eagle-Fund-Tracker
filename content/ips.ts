// The Investment Policy Statement and AI use policy, as shown on the
// "IPS & AI Policy" page (app/(app)/ips/page.tsx). This is the whole text:
// edit it here and the page follows. Nothing else needs to change.
//
// Format, one item per line:
//   # Title            the page title (first) or a new major part (later ones)
//   ## 8. Heading      a section; its number is used for the page's contents list
//   - item             a bullet
//   > Why: ...         the reason for a rule, shown in italics
//   | a | b | c        a table row (the first row is the header)
//   **bold**           bold text
//   [TO DECIDE: Q4]    anything in square brackets is outlined as an open item
// Any other line is a paragraph.

export const IPS_TEXT = String.raw`
# Eagle Fund Investment Policy Statement
**DRAFT v0.1 for review and vote. Not in force until adopted under Section 12.**
Yellow items are open: each one points to a numbered question in the Open Questions list. A line starting "Why:" gives the reason for a rule, so people who were not here can judge whether it still fits. Cite sections as "per IPS 8.5".
## 1. Purpose and scope
1.1 This IPS says how the Eagle Fund chooses investments, places trades, measures results, and hands its work to the next class.
1.2 It applies to every member, to the faculty advisor, and to every account that holds fund assets. The fund is student-managed, holds roughly $300K, and is held at Charles Schwab [TO DECIDE: Q15].
1.3 The fund runs through the Portfolio Management course under faculty advisor Dr. Brad Andrew. Any board, committee or college office with authority over the fund: [TO DECIDE: Q1].
1.4 If this IPS conflicts with a college rule or the law, the college rule or the law wins.
> Why: a written policy lets someone who was not in the room make the same decision the founders would have.
## 2. Roles and responsibilities
2.1 **Faculty advisor.** Approves or rejects every trade. Keeps the final say on this IPS.
2.2 **Portfolio managers (PMs).** Enrolled students. Vote on pitches and on changes to this IPS.
2.3 **Analysts.** Research securities and write pitches. An analyst may also be a PM.
2.4 **Sleeve leads.** One per sleeve. Keep the sleeve inside its range (Section 5) and bring rebalancing proposals (Section 6).
2.5 **Risk and compliance officer.** A student, named each term, who checks trades and limits against this IPS and reports breaches. Whether to create this role: [TO DECIDE: Q10].
2.6 **Records keeper.** A student, named each term, who makes sure Section 13 is followed.
> Why: every duty has a named person, so nothing depends on someone remembering to do it.
## 3. Investment objectives
3.1 **Return.** [TO DECIDE: Q3]. It must be a number, measured net of costs, against the benchmark in 5.1, over a stated period.
3.2 **Risk.** [TO DECIDE: Q4]. It must be a number: a maximum drawdown, a tracking error limit, or a volatility limit.
> Why: an objective that cannot be measured cannot be missed, so it cannot guide a decision.
## 4. Constraints
4.1 **Liquidity.** Cash floor and any yearly payment to the college or a scholarship: [TO DECIDE: Q5].
4.2 **Time horizon.** [TO DECIDE: Q6].
4.3 **Legal and college rules.** No trading on non-public information. A member who owns a security, or has a personal interest in it, discloses this before pitching or voting on it and does not vote on it.
4.4 **Instruments.** Leverage, short selling and options held directly: [TO DECIDE: Q7]. The fund already holds funds that use options or futures inside them, so the rule must say whether those are allowed.
4.5 **Restricted securities, ESG screens, position, sector and single-stock caps:** [TO DECIDE: Q7].
> Why: constraints are the limits no pitch, however good, can override.
## 5. Strategic asset allocation and sleeves
5.1 **Benchmark.** 80% MSCI ACWI and 20% Bloomberg US Aggregate Bond Index, tracked in the fund's tracker with the ACWI and AGG ETFs as stand-ins. The benchmark changes only under Section 12.
5.2 **Sleeves.** The fund has four sleeves: VPIS, MOM, BHAC and HE. There is no AW sleeve. If a fifth is wanted, that is an amendment under Section 12.
| Sleeve | What it does | Target weight | Allowed range |
| VPIS | [TO DECIDE: Q2] | [TO DECIDE: Q2] | [TO DECIDE: Q2] |
| MOM | [TO DECIDE: Q2] | [TO DECIDE: Q2] | [TO DECIDE: Q2] |
| BHAC | [TO DECIDE: Q2] | [TO DECIDE: Q2] | [TO DECIDE: Q2] |
| HE | [TO DECIDE: Q2] | [TO DECIDE: Q2] | [TO DECIDE: Q2] |
5.3 Weights are measured on total fund value, including cash.
> Why: ranges, not single points, so normal price moves do not force trades.
## 6. Rebalancing
6.1 **Calendar.** Sleeve weights are checked [TO DECIDE: Q8].
6.2 **Trigger.** A sleeve outside its range starts a rebalancing review within [TO DECIDE: Q8] business days.
6.3 A rebalancing trade goes through the same pitch, vote and approval steps as any other trade (Sections 7 and 8). It is never exempt.
> Why: rebalancing involves several trades at once, which is where mistakes are most costly.
## 7. Security selection
7.1 **A pitch must contain:** the thesis (why this security, why now, why this sleeve); a valuation (method, intrinsic value, price target, margin of safety); the key catalysts; the key risks; exit criteria (what would make us sell or reverse); the proposed size as a share of the fund; and a check against Sections 4 and 9.
7.2 Every pitch is filed in the Decision Log with its supporting documents and its AI use statement (14.5).
7.3 **Notice.** A pitch is shared with all PMs at least [TO DECIDE: Q9] before the vote.
7.4 **Vote.** Each PM votes for, against, or needs-review. Quorum and the share needed to pass: [TO DECIDE: Q9]. A member with a conflict under 4.3 does not vote.
7.5 **Approval.** A passed vote goes to the faculty advisor. A trade needs both the vote and the advisor's approval. Neither one alone is enough.
7.6 Sells follow the same path. A sell is linked to the buy it closes.
7.7 A rejected pitch is recorded with the reason.
> Why: two independent checks, one by peers and one by the advisor, catch different mistakes.
## 8. Trade execution controls
This section exists because about 95% of the fund's assets were liquidated by accident. Its aim is that no single person can do that again. What caused that event: [TO DECIDE: Q16]. The controls below should be checked against the real cause.
8.1 **No order without an approval record.** Before any order, the tracker holds an approval record: ticker, action, number of shares, sleeve, vote result, advisor approval. The order must match it exactly.
8.2 **No order by one person alone.** Every order is entered by one person (the placer) and checked by a second, different person (the checker) before it is submitted.
8.3 **Who may place orders.** Only the people named in [TO DECIDE: Q10]. Nobody shares a login. Other members have view-only access where Schwab allows it.
8.4 **Pre-trade checklist.** The placer and the checker both confirm, in writing:
- the approval record exists and matches
- the account, ticker and action (buy or sell) are right
- the quantity is a number of shares, not a percentage or a dollar figure, and matches the record
- the order is for one position; bulk, multi-position, "sell all" and "close position" functions are not used
- the order preview's estimated value matches what was expected, within [TO DECIDE: Q10]
- weights after the trade stay inside Sections 4, 5 and 9
- cash is enough for a buy
- the order type is allowed (8.6)
8.5 **Extra step for large orders.** Any single order above [TO DECIDE: Q10] of the fund's value, or any session placing more than [TO DECIDE: Q10] orders, needs the faculty advisor to review the preview before submission.
8.6 **Order types.** [TO DECIDE: Q10]. Whatever is chosen, an order type that can fill at any price in a thin market needs a written reason.
8.7 **Account safeguards.** The advisor asks Schwab which of these it offers, and turns on those it does: restricting trade permissions, order-size alerts, and two-person authorization.
8.8 **After the trade.** By the next business day: confirm the fill against Schwab's confirmation; record the trade in the tracker only once it has filled; check positions and cash against Schwab.
8.9 **If something goes wrong.** Stop. Tell the advisor the same day. Do not fix an error with another large trade unless it is approved under 8.1. Write down what happened.
> Why: most costly trading errors are typing or selection errors. A second person looking at a preview is cheap and catches them.
## 9. Risk management
9.1 **Position limit.** [TO DECIDE: Q7].
9.2 **Concentration limits** (sector, single stock, sleeve): [TO DECIDE: Q7].
9.3 **Review trigger.** A position that falls [TO DECIDE: Q11] from cost or from its peak gets a written review pitch within [TO DECIDE: Q11]. The review decides hold, add or sell. The drop does not sell anything automatically.
9.4 **Cash floor.** [TO DECIDE: Q5].
9.5 **Fund-level trigger.** If the fund reaches the drawdown in 3.2, the advisor and PMs meet and decide what to do.
9.6 The risk officer reports any breach to the advisor within the same week.
> Why: review triggers prompt thought without forcing a sale at the worst time.
## 10. Performance measurement
10.1 Compare with the benchmark in 5.1.
10.2 Use time-weighted returns, net of costs, so deposits and withdrawals do not distort them.
10.3 Break down results by sleeve: each sleeve's contribution to fund return and to the gap versus benchmark.
10.4 Schwab statements are the official record. The tracker is the working copy, and it is reconciled to the statements every month.
10.5 How often, and to whom: Section 11.
> Why: results are judged on one method that every class can repeat.
## 11. Reporting
| Report | To | How often |
| Holdings and performance vs benchmark | All members and the advisor | [TO DECIDE: Q12] |
| Limits and breaches | Advisor | [TO DECIDE: Q12] |
| Reconciliation to Schwab | Advisor | Monthly (10.4) |
| Decision reviews (did the thesis play out) | All members | [TO DECIDE: Q12] |
| Annual report | Oversight body in 1.3 | [TO DECIDE: Q12] |
> Why: regular reports make problems visible while they are still small.
## 12. Review and amendment
12.1 The IPS is reviewed once a year, in [TO DECIDE: Q9], and after any serious incident.
12.2 An amendment is written, shared with all PMs, voted on under 7.4, and approved by the advisor. The new version carries a date and a one-line change note.
12.3 Every new member reads this IPS and signs that they have.
> Why: members change every year; amending on a schedule keeps the policy alive.
## 13. Knowledge transfer
13.1 Every decision lives in the Decision Log: thesis, documents, vote, execution, and later review.
13.2 Each spring, outgoing sleeve leads write a one-page memo: what the sleeve holds, why, and what to watch.
13.3 New members read the one-page summary on day one and Sections 7, 8 and 14 within their first week.
13.4 Records are backed up. The tracker and its files are copied [TO DECIDE: Q12].
> Why: the fund's memory should live in records, not in people who graduate.
## 14. Use of AI tools
14.1 **Scope.** Any AI tool (chat assistants, coding tools, AI features in other software) used for fund work.
14.2 **Permitted uses.**
- (a) Summarizing public filings, earnings calls and articles, then checking the summary (14.4)
- (b) Drafting or editing memos from the member's own analysis
- (c) Building and debugging spreadsheets and code, with the logic reviewed by a person
- (d) Checking calculations, as a second check and never the only one
- (e) Explaining concepts and suggesting questions to research
14.3 **Prohibited uses.**
- (a) Letting AI decide whether, what, when or how much to buy or sell, or treating its answer as a vote
- (b) Giving AI any brokerage login, trading access or ability to place orders
- (c) Giving AI the tracker's database keys or other fund system credentials: [TO DECIDE: Q13]
- (d) Entering personal information, student records, account numbers, passwords, or non-public information about any company
- (e) Presenting AI output as your own original analysis
14.4 **Verification rule.** Every number, fact, quote and source from an AI tool is checked against a primary source (10-K, 10-Q, 8-K, earnings release, Schwab data) before it goes into a pitch or report. A source an AI names does not count until the member has opened it and found the claim in it. A model's key outputs are recalculated by hand or in a separate tool. Anything not verified is removed or marked "unverified". The pitch records where each key figure was checked.
14.5 **Disclosure.** Every pitch and report ends with an AI use statement: which tool, what it was used for, and what was verified and by whom. Example: "AI use: [tool name] drafted the summary of the 10-K business section. I verified every figure against the 10-K (pp. 12-18)." If no AI was used, say so.
14.6 **Data and privacy.** Approved tools and the fund data each may receive: [TO DECIDE: Q13]. Until that is decided, enter only public information.
14.7 **Accountability.** The member who submits the work is responsible for it, including every error an AI tool introduced. "The tool said so" is not a defense.
14.8 **Academic integrity.** Juniata College's policy applies to course work and to fund work. Policy text: [TO DECIDE: Q14]. Where this section is stricter, this section applies.
14.9 **Review.** This section is reviewed at the start of each term [TO DECIDE: Q14], and any time a tool changes its data terms or a member proposes a change.
> Why: AI tools are fast and sometimes wrong in convincing ways. The rules keep a person responsible for every claim and every trade.
## Open Questions
Each needs a decision before the IPS is adopted. The options are starting points.
**Q1. Who oversees the fund above the advisor?** (a) Faculty advisor only: simple, but one person is the only check. (b) Add a small student-faculty committee: more oversight, slower. (c) Report to the college's finance or endowment office: strongest standing, but they may impose their own rules.
**Q2. Sleeve descriptions, target weights, ranges.** (a) Use the ranges now in the tracker (Buy & Hold Asset Class 26-36%, Buy & Hold Value 24-33%, Momentum 22-28%, Defensive 15-20%): fast, but the tracker names do not obviously match VPIS, MOM, BHAC and HE. (b) Redo from scratch: cleaner, takes a class meeting. (c) Set targets only, ranges later: quick, but there is no rebalancing trigger until ranges exist.
**Q3. Return objective.** (a) Beat the benchmark net of costs over rolling 3 years: easy to explain, three years is longer than a student's time here. (b) Match the benchmark within a band: realistic for a small fund, a weaker goal. (c) Absolute return target: easy to state, ignores the market.
**Q4. Risk limit.** (a) Maximum drawdown, for example from peak: simple and easy to explain, backward-looking. (b) Tracking error versus benchmark: fits a benchmark-based fund, harder for new members. (c) Both, with drawdown as the one that triggers action.
**Q5. Cash floor and distributions.** (a) No yearly distribution, a small cash floor: maximizes growth, risks forced sales. (b) A set yearly payment: supports the college, needs a liquid reserve. (c) Floor equal to the next payment plus a buffer.
**Q6. Time horizon.** (a) Perpetual: supports long-term holdings. (b) Multi-year, reviewed each year: more flexible, less stable. (c) Perpetual with a fixed spending rule: pairs well with Q5.
**Q7. Instrument, position, sector and single-stock limits; restricted securities; ESG.** Decide each: (a) Hard caps (a stated percent): clear, can force trims. (b) Review triggers instead of caps: flexible, easier to ignore. For options-based and futures-based funds the fund already holds: (a) allowed as funds, not directly: keeps current holdings. (b) Not allowed: simple, forces sales.
**Q8. Rebalancing calendar and trigger.** (a) Calendar only (for example, each term): predictable, may miss big drifts. (b) Range breach only: responsive, more trades. (c) Both: a calendar check plus breach triggers.
**Q9. Vote rules and review month.** Notice period, quorum, pass threshold, IPS review month. (a) Simple majority of PMs present: fast, thin margins can pass trades. (b) Two-thirds: more agreement, can stall. Notice of a few days gives time to read, and slows fast-moving ideas.
**Q10. Trade controls.** Who may place orders; whether to add a risk officer; the large-order size; the maximum orders per session; the allowed difference between expected and previewed value; order types. (a) Only the advisor holds trading permission, students prepare orders: safest, depends on one person. (b) Advisor plus one named student: a backup, one more credential. Order types: (a) limit orders only: avoids bad fills, may not fill. (b) Market orders allowed for large liquid ETFs: simpler, less control.
**Q11. Review trigger size and deadline.** (a) A tight trigger: more reviews, more noise. (b) A loose trigger: fewer, risks slow reaction. Pick a drop from cost or peak, and a time limit.
**Q12. Reporting and backup frequency.** (a) Monthly internal, quarterly formal: steady, more work. (b) Quarterly only: lighter, slower to see problems. Back up each term at least.
**Q13. Approved AI tools and data allowed.** (a) Public data only, any tool: simple, limits usefulness. (b) Fund holdings and trades allowed in an approved tool with training-on-your-data turned off: more useful, needs a vetted tool. The tracker's code is maintained with an AI coding tool that holds its database keys: (a) allow, with no brokerage access ever: keeps current practice. (b) Ban it: removes that risk, makes the tracker much harder to maintain.
**Q14. Academic integrity text and AI review month.** Paste Juniata's policy so 14.8 can quote it. Options for review: each term (more current), or once a year (lighter, falls behind).
**Q15. Which accounts does this cover?** The fund's records mention a Vanguard holding as well as Schwab. (a) Name every account here. (b) Move everything to Schwab: simplest controls, may mean selling a fund.
**Q16. What caused the liquidation?** Needed so Section 8 targets the real failure. Options: review the order history with Schwab, interview those involved, or both.
## Approval record
Adopted on [DATE] by a vote of [FOR] to [AGAINST] with [ABSTAIN] abstaining. Faculty advisor approval: [SIGNATURE, DATE].
# One-page summary for new members
**What this is.** The Eagle Fund is about $300K of Juniata College money. You may help run it. The rules below protect it. Full text is in the sections cited.
**The fund.** Benchmark: 80% global stocks (ACWI), 20% US bonds (AGG). Four sleeves: VPIS, MOM, BHAC, HE. Each has a target and a range (5.2).
**How a trade happens.** 1. An analyst writes a pitch: thesis, valuation, risks, exit criteria (7.1). 2. It is filed in the Decision Log. 3. PMs vote (7.4). 4. The faculty advisor approves or rejects (7.5). 5. An approval record is made. 6. One person enters the order; a second, different person checks the preview against a checklist (8.2, 8.4). 7. After the fill, record it and check it against Schwab (8.8).
**The rule behind it all.** No order without an approval record, and no order by one person alone (8.1, 8.2). The fund once lost about 95% of its assets to an accidental liquidation. These rules are why.
**What you must never do.** Trade on your own. Use a "sell all" or "close position" button (8.4). Share a Schwab login (8.3). Vote on a security you own (4.3).
**Using AI.** Allowed for summaries, drafts, models, code and a second check (14.2). Never to decide a trade, never with brokerage access or non-public information (14.3). Check every number against a primary source (14.4). End every pitch with an AI use statement (14.5). You are responsible for what you submit (14.7).
**If something goes wrong.** Stop. Tell the faculty advisor the same day. Do not fix it with another big trade (8.9).
**Your first week.** Read Sections 7, 8 and 14. Look at three past decisions in the Decision Log. Sign that you have read this IPS (12.3).
**Where decisions live.** Every pitch, vote, trade and review is kept in the Decision Log so the next class can see why (13.1).
`;
