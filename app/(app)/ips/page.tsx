import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import { IPS_FACTS, IPS_TEXT } from "@/content/ips";
import { cn } from "@/components/ui";
import { Fill } from "@/components/history/Fill";
import { IpsNav, type IpsNavItem } from "@/components/ips/IpsNav";
import styles from "@/components/history/history.module.css";

// The fund's Investment Policy Statement and AI use policy. All of the text
// is in content/ips.ts; this page only lays it out.

export const metadata: Metadata = { title: "IPS & AI Policy · Eagle Fund" };

/* ---------------------------------------------------------------- parsing */

type Block =
  | { kind: "clause"; num: string; text: string }
  | { kind: "p"; text: string }
  | { kind: "why"; text: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "steps"; items: string[] }
  | { kind: "table"; rows: string[][] };

interface Section {
  id: string;
  num?: string;
  title: string;
  blocks: Block[];
}

interface Doc {
  title: string;
  preamble: Block[];
  sections: Section[];
  guide: { title: string; blocks: Block[] } | null;
  /** how many lines of the policy text still hold a [TO DECIDE] */
  open: number;
}

function parse(source: string): Doc {
  const doc: Doc = { title: "", preamble: [], sections: [], guide: null, open: 0 };
  let target: Block[] = doc.preamble;
  let titles = 0;
  const lines = source.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (ln.startsWith("# ")) {
      if (titles++ === 0) {
        doc.title = ln.slice(2);
      } else {
        doc.guide = { title: ln.slice(2), blocks: [] };
        target = doc.guide.blocks;
      }
    } else if (ln.startsWith("## ")) {
      const text = ln.slice(3);
      const m = text.match(/^(\d+)\.\s*(.*)$/);
      const section: Section = m
        ? { id: `s-${m[1]}`, num: m[1], title: m[2], blocks: [] }
        : { id: "s-" + text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), title: text, blocks: [] };
      doc.sections.push(section);
      target = section.blocks;
    } else if (ln.startsWith("> ")) {
      target.push({ kind: "why", text: ln.slice(2).replace(/^Why:\s*/, "") });
    } else if (ln.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) items.push(lines[i++].slice(2));
      i--;
      target.push({ kind: "bullets", items });
    } else if (ln.startsWith("| ")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("| ")) {
        rows.push(lines[i++].replace(/^\| /, "").replace(/ \|$/, "").split(" | "));
      }
      i--;
      target.push({ kind: "table", rows });
    } else if (/^\d+\.\d+\s/.test(ln)) {
      const m = ln.match(/^(\d+\.\d+)\s+(.*)$/)!;
      target.push({ kind: "clause", num: m[1], text: m[2] });
    } else if (/^\d+\.\s/.test(ln)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) items.push(lines[i++].replace(/^\d+\.\s+/, ""));
      i--;
      target.push({ kind: "steps", items });
    } else if (ln.trim()) {
      target.push({ kind: "p", text: ln });
    }
    if (!doc.guide && ln.includes("[TO DECIDE")) doc.open++;
  }
  return doc;
}

/* ----------------------------------------------------------------- pieces */

const TOKEN = /(\*\*[^*]+\*\*)/;

/** Inline text: **bold**, and [bracketed] open items outlined by <Fill>. */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(TOKEN).map((part, i) =>
        part.startsWith("**") ? (
          <strong key={i} className="font-semibold text-ink">
            <Fill text={part.slice(2, -2)} />
          </strong>
        ) : (
          <Fill key={i} text={part} />
        ),
      )}
    </>
  );
}

const icon = "h-4 w-4 shrink-0";

function CheckIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className={icon} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 10.5l3.5 3.5 7.5-8" />
    </svg>
  );
}
function CrossIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className={icon} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />
    </svg>
  );
}
function BulbIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className={icon} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.5 15.5h5M8 18h4M10 2.5a5 5 0 0 0-3 9c.6.5 1 1.2 1 2h4c0-.8.4-1.5 1-2a5 5 0 0 0-3-9z" />
    </svg>
  );
}
function BookIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 4.5c2.5-.8 4.8-.6 6.5 1 1.7-1.6 4-1.8 6.5-1v10.5c-2.5-.8-4.8-.6-6.5 1-1.7-1.6-4-1.8-6.5-1z" />
      <path d="M10 5.5V16" />
    </svg>
  );
}
function SealIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="8" r="4.5" />
      <path d="M8.2 8l1.3 1.3L12 6.7M7.5 12l-1 5 3.5-1.8 3.5 1.8-1-5" />
    </svg>
  );
}

/** Numbered badge (or an icon) at the head of a section card. */
function Badge({ children, tone = "brand" }: { children: ReactNode; tone?: "brand" | "gold" }) {
  return (
    <span
      className={cn(
        "grid h-10 w-10 shrink-0 place-items-center rounded-lg font-mono text-sm font-semibold tnum",
        tone === "brand" ? "bg-brand text-brand-contrast" : "border border-gold/30 bg-gold-soft text-gold",
      )}
    >
      {children}
    </span>
  );
}

function Card({ id, badge, title, eyebrow, children }: { id: string; badge: ReactNode; title: string; eyebrow?: string; children: ReactNode }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-16 overflow-hidden rounded-xl border border-line border-t-2 border-t-gold/60 bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.04),0_14px_34px_-22px_rgba(15,23,42,0.3)] lg:scroll-mt-8"
    >
      <header className="flex items-center gap-4 border-b border-line bg-gradient-to-r from-brand/[0.07] to-transparent px-5 py-4 sm:px-7">
        {badge}
        <div className="min-w-0">
          {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">{eyebrow}</p> : null}
          <h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight text-ink">
            {title}
          </h2>
        </div>
      </header>
      {children}
    </section>
  );
}

function Why({ text }: { text: string }) {
  return (
    <aside className="flex gap-3 rounded-lg border border-gold/25 bg-gold-soft/40 px-4 py-3">
      <span className="mt-0.5 text-gold">
        <BulbIcon />
      </span>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gold">Why</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
          <Inline text={text} />
        </p>
      </div>
    </aside>
  );
}

/** Bullets under a "Permitted" / "Prohibited" clause get a tick or a cross. */
function Bullets({ items, context }: { items: string[]; context: string }) {
  const tone = /permitted/i.test(context) ? "pos" : /prohibited/i.test(context) ? "neg" : "neutral";
  return (
    <ul
      className={cn(
        "ml-0 flex flex-col gap-2.5 rounded-lg border px-4 py-3.5 sm:ml-[3.25rem]",
        tone === "pos" && "border-pos/20 bg-pos-soft/50",
        tone === "neg" && "border-neg/20 bg-neg-soft/50",
        tone === "neutral" && "border-line bg-surface-2/50",
      )}
    >
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm leading-relaxed text-ink">
          <span
            className={cn(
              "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full",
              tone === "pos" && "bg-pos/15 text-pos",
              tone === "neg" && "bg-neg/15 text-neg",
              tone === "neutral" && "bg-line text-muted",
            )}
          >
            {tone === "pos" ? <CheckIcon /> : tone === "neg" ? <CrossIcon /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
          </span>
          <span>
            <Inline text={item.replace(/^\([a-z]\)\s*/, "")} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function Table({ rows }: { rows: string[][] }) {
  const [head, ...body] = rows;
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[32rem] text-left text-sm">
        <thead className="bg-brand text-[11px] uppercase tracking-wider text-brand-contrast">
          <tr>
            {head.map((c, j) => (
              <th key={j} scope="col" className="px-4 py-2.5 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {body.map((row, r) => (
            <tr key={r} className="even:bg-surface-2/50">
              {row.map((c, j) =>
                j === 0 ? (
                  <th key={j} scope="row" className="px-4 py-3 text-left align-top font-mono text-[13px] font-semibold text-brand">
                    {c}
                  </th>
                ) : (
                  <td key={j} className="px-4 py-3 align-top text-ink">
                    <Inline text={c} />
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Body({ blocks }: { blocks: Block[] }) {
  let lastClause = "";
  return (
    <div className="flex flex-col gap-4 px-5 py-6 sm:px-7">
      {blocks.map((b, i) => {
        switch (b.kind) {
          case "clause":
            lastClause = b.text;
            return (
              <div key={i} className="grid grid-cols-[2.5rem_1fr] gap-x-3 text-sm leading-relaxed">
                <span className="pt-px font-mono text-xs font-semibold text-gold tnum">{b.num}</span>
                <p className="text-ink">
                  <Inline text={b.text} />
                </p>
              </div>
            );
          case "why":
            return <Why key={i} text={b.text} />;
          case "bullets":
            return <Bullets key={i} items={b.items} context={lastClause} />;
          case "table":
            return <Table key={i} rows={b.rows} />;
          case "steps":
            return null; // only used in the quick guide
          default:
            return (
              <p key={i} className="text-sm leading-relaxed text-ink">
                <Inline text={b.text} />
              </p>
            );
        }
      })}
    </div>
  );
}

/* -------------------------------------------------------------- the hero */

function Hero({ title, status, open }: { title: string; status: string; open: number }) {
  return (
    <section
      className={cn(
        styles.hero,
        "relative -mx-4 -mt-6 overflow-hidden px-6 py-12 sm:-mx-6 sm:px-10 sm:py-16 lg:-mx-10 lg:-mt-10 lg:rounded-b-2xl lg:px-16",
      )}
    >
      {/* faint price lines; decoration only */}
      <svg aria-hidden viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full">
        {[80, 160, 240, 320].map((y) => (
          <line key={y} x1="0" x2="1200" y1={y} y2={y} stroke="#ffffff" strokeOpacity="0.05" />
        ))}
        <polyline
          className={styles.heroLine}
          points="0,300 120,285 220,305 330,260 440,275 550,225 660,240 770,190 880,205 990,150 1100,165 1200,120"
          fill="none"
          stroke="#d8b25e"
          strokeOpacity="0.35"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          className={styles.heroLine}
          points="0,330 120,322 220,334 330,302 440,312 550,278 660,288 770,252 880,262 990,226 1100,236 1200,205"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.14"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className="relative">
        <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d8b25e]">
          <span className="h-px w-8 bg-[#d8b25e]" />
          Eagle Fund · Juniata College
        </p>
        <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#c9d5e8] sm:text-base">
          How the fund chooses investments, places trades and measures results, and how members may use AI tools along the way.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#d8b25e]/50 bg-[#d8b25e]/10 px-3 py-1 text-xs font-medium text-[#e9cf93]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d8b25e]" />
            {status}
          </span>
          {open > 0 ? (
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-[#c9d5e8]">
              {open} open {open === 1 ? "item" : "items"} to decide
            </span>
          ) : null}
        </div>

        <dl className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {IPS_FACTS.map((f) => (
            <div key={f.label} className="rounded-lg border border-white/15 bg-white/[0.06] px-4 py-3.5 backdrop-blur-sm">
              <dt className="text-[11px] font-medium uppercase tracking-wider text-[#9fb2d1]">{f.label}</dt>
              <dd className="mt-1.5 text-xl font-semibold tracking-tight tnum sm:text-2xl">{f.value}</dd>
              {f.note ? <p className="mt-0.5 text-xs text-[#9fb2d1]">{f.note}</p> : null}
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ quick guide */

/** "**Lead.** rest" -> { lead, rest } */
function splitLead(text: string) {
  const m = text.match(/^\*\*(.+?)\*\*\s*(.*)$/);
  return m ? { lead: m[1].replace(/\.$/, ""), rest: m[2] } : { lead: "", rest: text };
}

function Guide({ title, blocks }: { title: string; blocks: Block[] }) {
  const cards: ReactNode[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const next = blocks[i + 1];
    if (b.kind === "p") {
      const { lead, rest } = splitLead(b.text);
      if (!rest && next?.kind === "steps") {
        // a lead-in followed by a numbered list: draw it as a timeline
        cards.push(
          <div key={i} className="rounded-lg border border-line bg-surface-2/50 px-5 py-5 sm:col-span-2">
            <h3 className="text-sm font-semibold text-ink">{lead}</h3>
            <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {next.items.map((item, j) => (
                <li key={j} className="relative flex gap-3 sm:block">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand font-mono text-xs font-semibold text-brand-contrast tnum">
                    {j + 1}
                  </span>
                  <p className="text-[13px] leading-relaxed text-muted sm:mt-3">
                    <Inline text={item} />
                  </p>
                </li>
              ))}
            </ol>
          </div>,
        );
        i++;
        continue;
      }
      const never = /never/i.test(lead);
      cards.push(
        <div
          key={i}
          className={cn(
            "rounded-lg border px-5 py-4",
            never ? "border-neg/25 bg-neg-soft/40" : "border-line bg-surface-2/50",
            rest.length > 170 && "sm:col-span-2",
          )}
        >
          {lead ? <h3 className={cn("text-sm font-semibold", never ? "text-neg" : "text-ink")}>{lead}</h3> : null}
          <p className={cn("text-[13px] leading-relaxed text-muted", lead && "mt-1.5")}>
            <Inline text={rest} />
          </p>
        </div>,
      );
    }
  }
  return (
    <Card id="s-guide" badge={<Badge tone="gold"><BookIcon /></Badge>} eyebrow="One-page summary" title={title.replace(/^One-page summary for /i, "Quick guide for ")}>
      <div className="grid gap-3 px-5 py-6 sm:grid-cols-2 sm:px-7">{cards}</div>
    </Card>
  );
}

/* ------------------------------------------------------------------- page */

export default async function IpsPage() {
  await requireUser();
  const doc = parse(IPS_TEXT.trim());

  // the first line under the title is the status; any others are notes on how to read the document
  const status = doc.preamble.find((b) => b.kind === "p")?.text.replace(/\*\*/g, "") ?? "";
  const notes = doc.preamble.filter((b) => b.kind === "p").slice(1);

  const nav: IpsNavItem[] = [
    ...doc.sections.map((s) => ({ id: s.id, num: s.num, label: s.title })),
    ...(doc.guide ? [{ id: "s-guide", label: "Quick guide" }] : []),
  ];

  return (
    <div className={styles.page}>
      <Hero title={doc.title.replace(/^Eagle Fund\s+/, "")} status={status} open={doc.open} />

      <div className="mt-6 lg:mt-12 lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-12">
        <IpsNav items={nav} />

        <div className="flex min-w-0 flex-col gap-6">
          {notes.length > 0 ? (
            <div className="rounded-lg border border-line bg-surface px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">How to read this document</p>
              {notes.map((n, i) =>
                n.kind === "p" ? (
                  <p key={i} className="mt-1.5 text-sm leading-relaxed text-muted">
                    <Inline text={n.text} />
                  </p>
                ) : null,
              )}
            </div>
          ) : null}

          {doc.sections.map((s) => (
            <Card
              key={s.id}
              id={s.id}
              badge={s.num ? <Badge>{s.num.padStart(2, "0")}</Badge> : <Badge tone="gold"><SealIcon /></Badge>}
              eyebrow={s.num ? `Section ${s.num}` : undefined}
              title={s.title}
            >
              <Body blocks={s.blocks} />
            </Card>
          ))}

          {doc.guide ? <Guide title={doc.guide.title} blocks={doc.guide.blocks} /> : null}
        </div>
      </div>
    </div>
  );
}
