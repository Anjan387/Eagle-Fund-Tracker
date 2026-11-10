// ============================================================================
// Fund History page — all of its content.
//
// Edit this file to change what the page says. Nothing here touches layout:
// the page (app/(app)/history/page.tsx) just reads these objects.
//
// Anything written as [ADD ...] is a placeholder for a fact that still needs
// to be filled in. The page shows placeholders with a dashed gold outline so
// they are easy to spot. Replace the whole bracketed text, brackets included.
//
// Where a field is `null` (a year, a number), put the real number in its
// place, with no quotes: foundingYear: 1998
// ============================================================================

export type Industry = "pe" | "banking" | "asset-management" | "consulting" | "other";

export const INDUSTRIES: { id: Industry; label: string }[] = [
  { id: "pe", label: "Private equity" },
  { id: "banking", label: "Banking" },
  { id: "asset-management", label: "Asset management" },
  { id: "consulting", label: "Consulting" },
  { id: "other", label: "Other" },
];

export interface HistoryImage {
  /** A file in /public, e.g. "/history/first-meeting.jpg" */
  src: string;
  /** Describe the picture for people who can't see it */
  alt: string;
}

export interface Stat {
  id: string;
  label: string;
  /** The number to count up to. null = not known yet (shows `placeholder`). */
  value: number | null;
  placeholder: string;
  /** "usd-thousands" shows 354000 as $354K */
  format?: "number" | "usd-thousands";
  suffix?: string;
  note?: string;
  /**
   * Filled in automatically when the page loads, replacing `value`:
   *  - "yearsActive": this year minus `fund.foundingYear`
   *  - "fundValue":   today's fund value from the tracker (holdings + cash);
   *                    `value` and `suffix` are only the fallback if that fails
   *  - "holdings":    number of open positions in the tracker
   */
  auto?: "yearsActive" | "fundValue" | "holdings";
}

export interface Milestone {
  id: string;
  /** Shown as written: "1998", "April 2026", "2010s" */
  year: string;
  title: string;
  /** One or two sentences, shown on the card */
  summary: string;
  /** The full story, one string per paragraph, shown when the card is opened */
  story: string[];
  image?: HistoryImage | null;
}

export interface Era {
  id: string;
  label: string;
  years: string;
  summary: string;
  points: string[];
}

export interface Alum {
  id: string;
  name: string;
  gradYear: number | null;
  role: string;
  firm: string;
  /** null = not set yet; the card then only appears under "All industries" */
  industry: Industry | null;
  /** 1-2 sentences in the alum's own words */
  quote: string;
  photo?: HistoryImage | null;
}

export interface Person {
  name: string;
  role: string;
  years: string;
}

// ---- The fund --------------------------------------------------------------

export const fund = {
  name: "The Eagle Fund",
  eyebrow: "Juniata College · Student-managed investment fund",
  foundingYear: null as number | null, // [ADD FOUNDING YEAR]
  foundingYearPlaceholder: "[ADD FOUNDING YEAR]",
  mission:
    "Students in the Portfolio Management course manage a real portfolio for Juniata College, advised by Dr. Brad Andrew.",
};

// ---- Numbers ---------------------------------------------------------------

export const stats: Stat[] = [
  {
    id: "years",
    label: "Years active",
    value: null,
    placeholder: "[ADD FOUNDING YEAR]",
    auto: "yearsActive",
    note: "Counted from the founding year",
  },
  {
    id: "aum",
    label: "Fund value today",
    value: 300_000,
    suffix: "+",
    placeholder: "[ADD CURRENT AUM]",
    format: "usd-thousands",
    auto: "fundValue",
    note: "Holdings plus cash, from the tracker",
  },
  {
    id: "holdings",
    label: "Current holdings",
    value: null,
    placeholder: "[ADD NUMBER OF HOLDINGS]",
    auto: "holdings",
    note: "Open positions in the tracker",
  },
  {
    id: "sleeves",
    label: "Strategy sleeves",
    value: 5,
    placeholder: "[ADD NUMBER OF SLEEVES]",
    note: "VPIS, MOM, BHAC, HE, AW",
  },
  {
    id: "students",
    label: "Students trained",
    value: null,
    placeholder: "[ADD STUDENTS TRAINED]",
    note: "Since the fund began",
  },
  {
    id: "alumni-finance",
    label: "Alumni working in finance",
    value: null,
    placeholder: "[ADD ALUMNI IN FINANCE]",
  },
];

// ---- Timeline --------------------------------------------------------------
// Oldest first. Add, remove or reorder freely; give each one a unique id.

export const milestones: Milestone[] = [
  {
    id: "founding",
    year: "[ADD FOUNDING YEAR]",
    title: "The fund is founded",
    summary: "Founded by [ADD FOUNDER NAMES AND ROLES].",
    story: [
      "[ADD WHY THE FUND WAS CREATED: WHAT PROBLEM OR OPPORTUNITY THE FOUNDERS SAW]",
      "[ADD HOW IT GOT STARTED: WHO APPROVED IT, HOW THE FIRST STUDENTS WERE CHOSEN]",
    ],
    image: null,
  },
  {
    id: "first-capital",
    year: "[ADD YEAR]",
    title: "First capital",
    summary: "The fund starts with [ADD STARTING AMOUNT] from [ADD DONOR OR COLLEGE ALLOCATION].",
    story: ["[ADD THE STORY OF THE FIRST CAPITAL: WHO GAVE IT, ON WHAT TERMS, THE FIRST INVESTMENTS]"],
    image: null,
  },
  {
    id: "milestone-3",
    year: "[ADD YEAR]",
    title: "[ADD MILESTONE TITLE]",
    summary: "[ADD ONE OR TWO SENTENCES ABOUT THIS MILESTONE]",
    story: ["[ADD THE FULL STORY OF THIS MILESTONE]"],
    image: null,
  },
  {
    id: "milestone-4",
    year: "[ADD YEAR]",
    title: "[ADD MILESTONE TITLE]",
    summary: "[ADD ONE OR TWO SENTENCES ABOUT THIS MILESTONE]",
    story: ["[ADD THE FULL STORY OF THIS MILESTONE]"],
    image: null,
  },
  {
    id: "hard-moment",
    year: "[ADD YEAR]",
    title: "[ADD A HARD MOMENT]",
    summary: "[ADD ONE OR TWO SENTENCES: A DOWNTURN, A BAD CALL, A CHANGE THAT WAS NOT EASY]",
    story: ["[ADD WHAT HAPPENED, WHAT THE STUDENTS DID, AND WHAT CHANGED AFTERWARDS]"],
    image: null,
  },
  {
    // From the tracker's own records (the "April 2026 post-liquidation
    // rebuild", valued from April 14, 2026). Check the wording.
    id: "rebuild-2026",
    year: "April 2026",
    title: "The portfolio is rebuilt",
    summary: "After the fund was liquidated, the portfolio was rebuilt in April 2026.",
    story: [
      "The portfolio the fund holds today dates from this rebuild. The tracker measures returns from April 14, 2026.",
      "[ADD WHY THE FUND WAS LIQUIDATED AND HOW THE REBUILD WAS DECIDED]",
    ],
    image: null,
  },
  {
    // From the tracker's own records (first ledger entries and daily fund
    // values are from September 2026). Check the wording.
    id: "tracker-2026",
    year: "September 2026",
    title: "The Eagle Fund Tracker goes live",
    summary:
      "The fund gets its own web app: holdings, trades, proposals and research in one place.",
    story: [
      "The tracker keeps a ledger of every trade, values the portfolio against its benchmark, and lets portfolio managers propose and vote on trades.",
      "[ADD WHO BUILT IT AND HOW THE FUND TRACKED ITS PORTFOLIO BEFORE]",
    ],
    image: null,
  },
];

// ---- Eras ------------------------------------------------------------------

export const eras: Era[] = [
  {
    id: "founding",
    label: "Founding",
    years: "[ADD YEARS]",
    summary: "[ADD TWO OR THREE SENTENCES ON HOW AND WHY THE FUND STARTED]",
    points: [
      "Founded by: [ADD FOUNDER NAMES AND ROLES]",
      "Starting capital: [ADD STARTING AMOUNT] from [ADD DONOR OR COLLEGE ALLOCATION]",
      "Why it was created: [ADD REASON]",
    ],
  },
  {
    id: "growth",
    label: "Growth",
    years: "[ADD YEARS]",
    summary: "[ADD TWO OR THREE SENTENCES ON HOW THE FUND GREW]",
    points: [
      "[ADD HOW THE FUND'S VALUE CHANGED OVER THESE YEARS]",
      "[ADD STRATEGY CHANGES]",
      "[ADD ADVISORS DURING THIS PERIOD]",
    ],
  },
  {
    id: "rebuild",
    label: "Rebuild",
    years: "2026",
    summary:
      "In April 2026 the portfolio was rebuilt after the fund was liquidated. [ADD WHY THE FUND WAS LIQUIDATED]",
    points: [
      "The tracker measures the current portfolio's returns from April 14, 2026.",
      "[ADD WHAT CHANGED IN THE STRATEGY AT THE REBUILD]",
      "[ADD WHO LED THE REBUILD]",
    ],
  },
  {
    id: "today",
    label: "Today",
    years: "2026 to now",
    summary:
      "The fund holds roughly $300K+ and is run by students in the Portfolio Management course, with Dr. Brad Andrew as faculty advisor.",
    points: [
      "Five strategy sleeves: VPIS, MOM, BHAC, HE and AW.",
      "Benchmark: 80% ACWI and 20% AGG.",
      "Trades are proposed, voted on and recorded in the Eagle Fund Tracker.",
    ],
  },
];

// The sleeves shown under "Today". Add what each code stands for.
export const sleeves: { code: string; name: string }[] = [
  { code: "VPIS", name: "[ADD FULL NAME]" },
  { code: "MOM", name: "[ADD FULL NAME]" },
  { code: "BHAC", name: "[ADD FULL NAME]" },
  { code: "HE", name: "[ADD FULL NAME]" },
  { code: "AW", name: "[ADD FULL NAME]" },
];

// ---- Alumni ----------------------------------------------------------------
// Copy a block to add someone. `industry` must be one of:
// "pe", "banking", "asset-management", "consulting", "other".

export const alumni: Alum[] = [
  {
    id: "alum-1",
    name: "[ADD ALUMNI NAME]",
    gradYear: null, // [ADD GRAD YEAR]
    role: "[ADD CURRENT ROLE]",
    firm: "[ADD FIRM]",
    industry: null, // [ADD INDUSTRY]
    quote: "[ADD 1-2 SENTENCE QUOTE]",
    photo: null,
  },
  {
    id: "alum-2",
    name: "[ADD ALUMNI NAME]",
    gradYear: null,
    role: "[ADD CURRENT ROLE]",
    firm: "[ADD FIRM]",
    industry: null,
    quote: "[ADD 1-2 SENTENCE QUOTE]",
    photo: null,
  },
  {
    id: "alum-3",
    name: "[ADD ALUMNI NAME]",
    gradYear: null,
    role: "[ADD CURRENT ROLE]",
    firm: "[ADD FIRM]",
    industry: null,
    quote: "[ADD 1-2 SENTENCE QUOTE]",
    photo: null,
  },
  {
    id: "alum-4",
    name: "[ADD ALUMNI NAME]",
    gradYear: null,
    role: "[ADD CURRENT ROLE]",
    firm: "[ADD FIRM]",
    industry: null,
    quote: "[ADD 1-2 SENTENCE QUOTE]",
    photo: null,
  },
  {
    id: "alum-5",
    name: "[ADD ALUMNI NAME]",
    gradYear: null,
    role: "[ADD CURRENT ROLE]",
    firm: "[ADD FIRM]",
    industry: null,
    quote: "[ADD 1-2 SENTENCE QUOTE]",
    photo: null,
  },
  {
    id: "alum-6",
    name: "[ADD ALUMNI NAME]",
    gradYear: null,
    role: "[ADD CURRENT ROLE]",
    firm: "[ADD FIRM]",
    industry: null,
    quote: "[ADD 1-2 SENTENCE QUOTE]",
    photo: null,
  },
];

// A line or two on what students take away from the fund, shown above the wall.
export const impactIntro = "[ADD TWO OR THREE SENTENCES ON THE SKILLS STUDENTS GAIN AND WHERE THEY GO NEXT]";

// ---- Advisors and leadership -----------------------------------------------

export const advisors: Person[] = [
  {
    name: "Dr. Brad Andrew",
    role: "Faculty advisor, through the Portfolio Management course",
    years: "[ADD START YEAR] to present",
  },
  {
    name: "[ADD PAST ADVISOR NAME]",
    role: "[ADD ROLE]",
    years: "[ADD YEARS]",
  },
];

export const studentLeaders: Person[] = [
  { name: "[ADD STUDENT LEADER NAME]", role: "[ADD ROLE]", years: "[ADD ACADEMIC YEAR]" },
  { name: "[ADD STUDENT LEADER NAME]", role: "[ADD ROLE]", years: "[ADD ACADEMIC YEAR]" },
  { name: "[ADD STUDENT LEADER NAME]", role: "[ADD ROLE]", years: "[ADD ACADEMIC YEAR]" },
];

// ---- Closing ---------------------------------------------------------------

export const closing = {
  heading: "Want to manage the fund?",
  line: "The Eagle Fund is run by students in the Portfolio Management course. [ADD HOW TO JOIN: COURSE NUMBER, PREREQUISITES, WHEN TO APPLY]",
  primary: { label: "Open the fund dashboard", href: "/overview" },
  // Set to e.g. { label: "Email Dr. Andrew", href: "mailto:..." } to show a second button.
  secondary: null as { label: string; href: string } | null,
};
