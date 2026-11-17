import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import { IPS_TEXT } from "@/content/ips";
import { PageHeader, cn } from "@/components/ui";
import { IpsNav, type IpsNavItem } from "@/components/ips/IpsNav";
import styles from "@/components/history/history.module.css";

// The fund's Investment Policy Statement. All of the text is in
// content/ips.ts; this page only lays it out.

export const metadata: Metadata = { title: "Investment Policy · Eagle Fund" };

/* ---------------------------------------------------------------- parsing */

type Block =
  | { kind: "sub"; num: string; title: string }
  | { kind: "term"; label: string; text: string }
  | { kind: "p"; text: string }
  | { kind: "list"; items: string[] };

interface Section {
  id: string;
  num: string;
  title: string;
  blocks: Block[];
}

function parse(source: string): { title: string; sections: Section[] } {
  let title = "";
  const sections: Section[] = [];
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i].trim();
    const blocks = sections[sections.length - 1]?.blocks;
    if (ln.startsWith("### ")) {
      const m = ln.slice(4).match(/^([\d.]+)\s+(.*)$/);
      blocks?.push({ kind: "sub", num: m?.[1] ?? "", title: m?.[2] ?? ln.slice(4) });
    } else if (ln.startsWith("## ")) {
      const m = ln.slice(3).match(/^(\d+)\.\s*(.*)$/);
      const num = m?.[1] ?? String(sections.length + 1);
      sections.push({ id: `s-${num}`, num, title: m?.[2] ?? ln.slice(3), blocks: [] });
    } else if (ln.startsWith("# ")) {
      title = ln.slice(2);
    } else if (ln.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("- ")) items.push(lines[i++].trim().slice(2));
      i--;
      blocks?.push({ kind: "list", items });
    } else if (ln) {
      const term = ln.match(/^\*\*([^*]+?):\*\*\s*(.*)$/);
      blocks?.push(term ? { kind: "term", label: term[1], text: term[2] } : { kind: "p", text: ln });
    }
  }
  return { title, sections };
}

/* ----------------------------------------------------------------- pieces */

/** Inline text with **bold**. */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
        part.startsWith("**") ? (
          <strong key={i} className="font-semibold text-ink">
            {part.slice(2, -2)}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  );
}

const icon = "h-3.5 w-3.5";

function CheckIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className={icon} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 10.5l3.5 3.5 7.5-8" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className={icon} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />
    </svg>
  );
}

type Tone = "pos" | "neg" | "neutral";

/** Lists under a "Permitted" / "Prohibited" subsection get a tick or a cross. */
function toneOf(subTitle: string): Tone {
  return /permitted/i.test(subTitle) ? "pos" : /prohibited/i.test(subTitle) ? "neg" : "neutral";
}

function List({ items, tone }: { items: string[]; tone: Tone }) {
  return (
    <ul
      className={cn(
        "flex flex-col divide-y overflow-hidden rounded-xl border",
        tone === "pos" && "divide-pos/15 border-pos/25 bg-pos-soft/40",
        tone === "neg" && "divide-neg/15 border-neg/25 bg-neg-soft/40",
        tone === "neutral" && "divide-line border-line bg-surface-2/50",
      )}
    >
      {items.map((item, i) => (
        <li key={i} className="flex gap-3.5 px-4 py-3.5 sm:px-5">
          <span
            className={cn(
              "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full",
              tone === "pos" && "bg-pos text-surface",
              tone === "neg" && "bg-neg text-surface",
              tone === "neutral" && "bg-line-strong text-ink",
            )}
          >
            {tone === "pos" ? <CheckIcon /> : tone === "neg" ? <CrossIcon /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
          </span>
          <span className="text-[15px] leading-relaxed text-ink">
            <Inline text={item} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** A run of labelled terms ("Benchmark:", "Rebalancing:" ...) as a definition list. */
function Terms({ terms }: { terms: { label: string; text: string }[] }) {
  return (
    <dl className="divide-y divide-line overflow-hidden rounded-xl border border-line">
      {terms.map((t) => (
        <div key={t.label} className="grid gap-x-6 gap-y-1.5 px-5 py-4 sm:grid-cols-[11rem_1fr] sm:py-5">
          <dt className="flex items-start gap-2.5 pt-0.5">
            <span className="mt-1.5 h-2 w-2 shrink-0 rotate-45 bg-gold" aria-hidden />
            <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-brand">{t.label}</span>
          </dt>
          <dd className="text-[15px] leading-relaxed text-ink">
            <Inline text={t.text} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Body({ blocks }: { blocks: Block[] }) {
  const out: ReactNode[] = [];
  let sub = "";
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.kind === "term") {
      // gather consecutive terms into one list
      const terms: { label: string; text: string }[] = [];
      while (i < blocks.length && blocks[i].kind === "term") {
        const t = blocks[i] as { label: string; text: string };
        terms.push({ label: t.label, text: t.text });
        i++;
      }
      i--;
      out.push(<Terms key={i} terms={terms} />);
    } else if (b.kind === "sub") {
      sub = b.title;
      out.push(
        <h3 key={i} className={cn("flex items-baseline gap-3", out.length > 0 && "mt-4")}>
          <span className="font-mono text-xs font-semibold text-gold-ink tnum">{b.num}</span>
          <span className="text-base font-semibold tracking-tight text-ink">{b.title}</span>
        </h3>,
      );
    } else if (b.kind === "list") {
      out.push(<List key={i} items={b.items} tone={toneOf(sub)} />);
    } else {
      out.push(
        <p key={i} className="text-[15px] leading-7 text-ink">
          <Inline text={b.text} />
        </p>,
      );
    }
  }
  return <div className="flex flex-col gap-5 px-5 py-6 sm:px-8 sm:py-8">{out}</div>;
}

function SectionCard({ s }: { s: Section }) {
  return (
    <section
      id={s.id}
      aria-labelledby={`${s.id}-title`}
      className="scroll-mt-16 overflow-hidden rounded-2xl border border-line bg-surface shadow-card lg:scroll-mt-8"
    >
      <header className="relative flex items-center gap-5 border-b border-line bg-gradient-to-r from-brand/[0.08] via-brand/[0.03] to-transparent px-5 py-5 sm:px-8">
        <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-gold" />
        <span className="font-mono text-3xl font-light leading-none text-brand/70 tnum sm:text-4xl">
          {s.num.padStart(2, "0")}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-ink">Section {s.num}</p>
          <h2 id={`${s.id}-title`} className="mt-0.5 text-lg font-semibold tracking-tight text-heading sm:text-xl">
            {s.title}
          </h2>
        </div>
      </header>
      <Body blocks={s.blocks} />
    </section>
  );
}

/* --------------------------------------------------------------- the hero */

function Hero({ title }: { title: string }) {
  return (
    <section
      className={cn(
        styles.hero,
        "relative overflow-hidden rounded-lg px-6 py-14 sm:px-10 sm:py-20 lg:px-16",
      )}
    >
      {/* faint price lines; decoration only */}
      <svg aria-hidden viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full">
        {[80, 160, 240, 320].map((y) => (
          <line key={y} x1="0" x2="1200" y1={y} y2={y} stroke="var(--on-hero)" strokeOpacity="0.05" />
        ))}
        <polyline
          className={styles.heroLine}
          points="0,300 120,285 220,305 330,260 440,275 550,225 660,240 770,190 880,205 990,150 1100,165 1200,120"
          fill="none"
          stroke="var(--gold)"
          strokeOpacity="0.35"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          className={styles.heroLine}
          points="0,330 120,322 220,334 330,302 440,312 550,278 660,288 770,252 880,262 990,226 1100,236 1200,205"
          fill="none"
          stroke="var(--on-hero)"
          strokeOpacity="0.14"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="relative">
        <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-on-hero-accent">
          <span className="h-px w-8 bg-on-hero-accent" />
          Juniata Eagle Fund
        </p>
        <h2 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">{title}</h2>
        <div className="mt-6 h-px w-24 bg-gradient-to-r from-gold to-transparent" />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- page */

export default async function IpsPage() {
  await requireUser();
  const { title, sections } = parse(IPS_TEXT.trim());
  const nav: IpsNavItem[] = sections.map((s) => ({ id: s.id, num: s.num, label: s.title }));

  return (
    <div className={styles.page}>
      <div className="mb-6">
        <PageHeader title="Investment Policy" />
      </div>
      <Hero title={title} />
      <div className="mt-6 lg:mt-12 lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-12">
        <IpsNav items={nav} />
        <div className="flex min-w-0 flex-col gap-8">
          {sections.map((s) => (
            <SectionCard key={s.id} s={s} />
          ))}
        </div>
      </div>
    </div>
  );
}
