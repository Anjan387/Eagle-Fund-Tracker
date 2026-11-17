import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  advisors,
  alumni,
  closing,
  fund,
  impactIntro,
  milestones,
  stats,
  studentLeaders,
  type Person,
} from "@/content/fund-history";
import { getHoldingRows } from "@/lib/fund";
import { getCashBalance, getSnapshots } from "@/lib/store";
import { cn, EmptyState, PageHeader } from "@/components/ui";
import { AlumniWall } from "@/components/history/AlumniWall";
import { Fill } from "@/components/history/Fill";
import { GrowthChart } from "@/components/history/GrowthChart";
import { Reveal } from "@/components/history/Reveal";
import { SectionNav, type NavSection } from "@/components/history/SectionNav";
import { StatCounters, type CounterStat } from "@/components/history/StatCounters";
import { Timeline } from "@/components/history/Timeline";
import styles from "@/components/history/history.module.css";

// The story of the fund. Everything it says comes from content/fund-history.ts;
// the only live figures are today's fund value, the number of holdings, and
// the year-by-year values the Overview chart already uses.

export const metadata: Metadata = { title: "Fund History · Eagle Fund" };

const SECTIONS: NavSection[] = [
  { id: "top", label: "Start" },
  { id: "numbers", label: "Numbers" },
  { id: "timeline", label: "Timeline" },
  { id: "growth", label: "Growth" },
  { id: "alumni", label: "Alumni" },
  { id: "leadership", label: "Leadership" },
  { id: "join", label: "Join" },
];

/** Today's figures from the tracker. null if they can't be loaded — the page still renders. */
async function liveNumbers() {
  try {
    const [rows, cashBalance, snapshots] = await Promise.all([
      getHoldingRows(),
      getCashBalance(),
      getSnapshots(),
    ]);
    const fundValue = rows.reduce((sum, r) => sum + r.marketValue, 0) + cashBalance;
    const thisYear = new Date().getFullYear();
    return {
      fundValue,
      holdings: rows.length,
      byYear: [
        ...snapshots
          .filter((s) => s.year < thisYear)
          .map((s) => ({ year: s.year, value: s.totalValue, live: false })),
        { year: thisYear, value: Math.round(fundValue), live: true },
      ],
    };
  } catch (e) {
    console.error("history: live numbers unavailable:", e);
    return null;
  }
}

export default async function HistoryPage() {
  const live = await liveNumbers();

  const counters: CounterStat[] = stats.map((s) => {
    let { value, suffix } = s;
    if (s.auto === "yearsActive") {
      value = fund.foundingYear == null ? null : new Date().getFullYear() - fund.foundingYear;
    } else if (s.auto === "fundValue" && live) {
      value = live.fundValue;
      suffix = undefined;
    } else if (s.auto === "holdings" && live) {
      value = live.holdings;
    }
    return { id: s.id, label: s.label, value, placeholder: s.placeholder, format: s.format, suffix, note: s.note };
  });

  return (
    <div className={styles.page}>
      <div className="mb-6">
        <PageHeader title="Fund History" />
      </div>
      <Hero />
      <SectionNav sections={SECTIONS} />

      <div className="mt-12 flex flex-col gap-16 sm:mt-16 sm:gap-24">
        <Section id="numbers" eyebrow="The fund in numbers" title="Where it stands">
          <StatCounters stats={counters} />
        </Section>

        <Section
          id="timeline"
          eyebrow="Timeline"
          title="How it started, and what happened next"
          intro="Open any milestone for the full story."
        >
          <Timeline milestones={milestones} />
        </Section>

        <Section
          id="growth"
          eyebrow="Growth"
          title="Fund value by year"
          intro="Year-end totals recorded in the tracker. The current year is a live estimate: holdings plus cash."
        >
          <div className={cn(styles.glass, "rounded-xl px-3 py-5 sm:px-5")}>
            {live ? (
              <GrowthChart data={live.byYear} />
            ) : (
              <EmptyState title="Fund values can't be loaded right now" hint="Try again in a minute." />
            )}
          </div>
        </Section>

        <Section id="alumni" eyebrow="Student impact" title="Where it took them" intro={impactIntro}>
          <AlumniWall alumni={alumni} />
        </Section>

        <Section id="leadership" eyebrow="Advisors and leadership" title="The people behind it">
          <div className="grid gap-4 md:grid-cols-2">
            <People title="Faculty advisors" people={advisors} />
            <People title="Student leaders" people={studentLeaders} />
          </div>
        </Section>

        <section id="join" tabIndex={-1} aria-labelledby="join-title" className="scroll-mt-16 focus:outline-none">
          <Reveal>
            <div className={cn(styles.hero, "rounded-2xl px-6 py-10 sm:px-10 sm:py-12")}>
              <h2 id="join-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {closing.heading}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-on-hero-muted sm:text-base">
                <Fill text={closing.line} />
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={closing.primary.href}
                  className="inline-flex items-center justify-center rounded-md bg-gold px-4 py-2.5 text-sm font-semibold text-on-gold transition-colors duration-150 hover:bg-on-hero-accent"
                >
                  {closing.primary.label}
                </Link>
                {closing.secondary ? (
                  <a
                    href={closing.secondary.href}
                    className="inline-flex items-center justify-center rounded-md border border-on-hero/30 px-4 py-2.5 text-sm font-medium text-on-hero transition-colors duration-150 hover:bg-on-hero/10"
                  >
                    {closing.secondary.label}
                  </a>
                ) : null}
              </div>
            </div>
          </Reveal>
        </section>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section
      id="top"
      tabIndex={-1}
      className={cn(
        styles.hero,
        "relative flex min-h-[60svh] flex-col justify-center overflow-hidden rounded-lg px-6 py-20 focus:outline-none sm:px-10 lg:px-16",
      )}
    >
      {/* slow lines that read as price charts; decoration only */}
      <svg
        aria-hidden
        viewBox="0 0 1200 700"
        preserveAspectRatio="xMidYMid slice"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        {[150, 250, 350, 450, 550, 650].map((y) => (
          <line key={y} x1="0" x2="1200" y1={y} y2={y} stroke="var(--on-hero)" strokeOpacity="0.05" />
        ))}
        <g className={styles.heroDrift} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <polyline
            className={styles.heroLine}
            points="-40,480 100,495 190,455 280,470 370,430 470,445 560,395 650,410 740,360 840,378 930,320 1020,338 1110,285 1260,300"
            stroke="var(--on-hero)"
            strokeOpacity="0.16"
            strokeWidth="2"
          />
          <polyline
            className={styles.heroLine}
            points="-40,625 110,600 200,612 300,575 390,590 480,540 580,555 670,505 760,520 850,470 950,485 1040,430 1130,445 1260,400"
            stroke="var(--sky)"
            strokeOpacity="0.5"
            strokeWidth="2"
          />
          <polyline
            className={styles.heroLine}
            points="-40,565 90,540 170,555 260,500 340,515 430,450 520,470 610,400 700,425 790,350 880,370 970,290 1060,310 1150,235 1260,250"
            stroke="var(--gold)"
            strokeOpacity="0.7"
            strokeWidth="2.5"
          />
          {[[430, 450], [790, 350], [1150, 235]].map(([cx, cy], i) => (
            <circle
              key={cx}
              className={styles.heroDot}
              cx={cx}
              cy={cy}
              r="4.5"
              fill="var(--gold)"
              style={{ animationDelay: `${i * 0.7}s` }}
            />
          ))}
        </g>
      </svg>

      {/* keeps the text readable where the lines pass behind it */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-hero-from/80 via-hero-from/35 to-transparent" />

      <div className="relative max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-on-hero-muted">{fund.eyebrow}</p>
        <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">{fund.name}</h2>
        <p className="mt-4 font-mono text-sm text-on-hero-accent sm:text-base">
          Est. <Fill text={fund.foundingYear == null ? fund.foundingYearPlaceholder : String(fund.foundingYear)} />
        </p>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-on-hero-muted sm:text-lg">
          <Fill text={fund.mission} />
        </p>
      </div>

      <a
        href="#numbers"
        className="absolute bottom-5 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 rounded-md px-3 py-1 text-[11px] uppercase tracking-widest text-on-hero-muted transition-colors duration-150 hover:text-on-hero"
      >
        Scroll
        <svg aria-hidden className={styles.cue} width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M4 7l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
    </section>
  );
}

function Section({
  id,
  eyebrow,
  title,
  intro,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      tabIndex={-1}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-16 focus:outline-none lg:scroll-mt-8"
    >
      <Reveal>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-ink">{eyebrow}</p>
        <h2 id={`${id}-title`} className="mt-2 text-2xl font-semibold tracking-tight text-heading sm:text-3xl">
          {title}
        </h2>
        {intro ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            <Fill text={intro} />
          </p>
        ) : null}
      </Reveal>
      <Reveal delay={120} className="mt-6">
        {children}
      </Reveal>
    </section>
  );
}

function People({ title, people }: { title: string; people: Person[] }) {
  return (
    <div className={cn(styles.glass, "rounded-xl")}>
      <h3 className="border-b border-line px-5 py-4 text-sm font-semibold tracking-tight text-ink">{title}</h3>
      <ul className="divide-y divide-line">
        {people.map((person, i) => (
          <li key={i} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">
                <Fill text={person.name} />
              </p>
              <p className="mt-0.5 text-xs text-muted">
                <Fill text={person.role} />
              </p>
            </div>
            <p className="shrink-0 font-mono text-xs text-faint">
              <Fill text={person.years} />
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
