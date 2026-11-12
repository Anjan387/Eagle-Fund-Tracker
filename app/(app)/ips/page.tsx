import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import { IPS_TEXT } from "@/content/ips";
import { Card, PageHeader } from "@/components/ui";
import { Fill } from "@/components/history/Fill";

// The fund's Investment Policy Statement and AI use policy. All of the text
// is in content/ips.ts; this page only lays it out.

export const metadata: Metadata = { title: "IPS & AI Policy · Eagle Fund" };

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

type Block =
  | { kind: "title"; text: string }
  | { kind: "part"; text: string }
  | { kind: "section"; text: string; id: string }
  | { kind: "p"; text: string }
  | { kind: "why"; text: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "table"; rows: string[][] };

function parse(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.split("\n");
  let titles = 0;
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (ln.startsWith("# ")) {
      blocks.push(titles++ === 0 ? { kind: "title", text: ln.slice(2) } : { kind: "part", text: ln.slice(2) });
    } else if (ln.startsWith("## ")) {
      const text = ln.slice(3);
      const id = "s-" + (text.match(/^\d+/)?.[0] ?? text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
      blocks.push({ kind: "section", text, id });
    } else if (ln.startsWith("> ")) {
      blocks.push({ kind: "why", text: ln.slice(2) });
    } else if (ln.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) items.push(lines[i++].slice(2));
      i--;
      blocks.push({ kind: "bullets", items });
    } else if (ln.startsWith("| ")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("| ")) rows.push(lines[i++].replace(/^\| /, "").replace(/ \|$/, "").split(" | "));
      i--;
      blocks.push({ kind: "table", rows });
    } else if (ln.trim()) {
      blocks.push({ kind: "p", text: ln });
    }
  }
  return blocks;
}

export default async function IpsPage() {
  await requireUser();
  const blocks = parse(IPS_TEXT.trim());
  const title = blocks.find((b) => b.kind === "title");
  const contents = blocks.flatMap((b) => (b.kind === "section" ? [b] : []));
  const out: ReactNode[] = [];

  blocks.forEach((b, i) => {
    if (b.kind === "title") return;
    if (b.kind === "part") {
      out.push(
        <h2 key={i} className="mt-6 border-t border-line pt-6 text-lg font-semibold tracking-tight text-ink">
          <Inline text={b.text} />
        </h2>,
      );
    } else if (b.kind === "section") {
      out.push(
        <h3 key={i} id={b.id} className="mt-6 scroll-mt-6 text-base font-semibold tracking-tight text-brand">
          {b.text}
        </h3>,
      );
    } else if (b.kind === "why") {
      out.push(
        <p key={i} className="border-l-2 border-gold/50 pl-3 text-xs italic leading-relaxed text-muted">
          <Inline text={b.text} />
        </p>,
      );
    } else if (b.kind === "bullets") {
      out.push(
        <ul key={i} className="ml-5 list-disc space-y-1 text-sm leading-relaxed text-ink marker:text-faint">
          {b.items.map((item, j) => (
            <li key={j}>
              <Inline text={item} />
            </li>
          ))}
        </ul>,
      );
    } else if (b.kind === "table") {
      const [head, ...body] = b.rows;
      out.push(
        <div key={i} className="overflow-x-auto rounded-md border border-line">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="bg-surface-2 text-[11px] uppercase tracking-wide text-faint">
              <tr>
                {head.map((c, j) => (
                  <th key={j} scope="col" className="px-3 py-2 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {body.map((row, r) => (
                <tr key={r}>
                  {row.map((c, j) => (
                    <td key={j} className="px-3 py-2 align-top text-ink">
                      <Inline text={c} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
    } else {
      out.push(
        <p key={i} className="text-sm leading-relaxed text-ink">
          <Inline text={b.text} />
        </p>,
      );
    }
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="IPS & AI Policy"
        description="The fund's Investment Policy Statement, including how members may use AI tools. This is a draft: outlined items are still to be decided."
      />

      <Card className="px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">On this page</p>
        <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {contents.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-muted hover:text-brand hover:underline">
                {s.text}
              </a>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="flex flex-col gap-3 px-5 py-6 sm:px-8">
        {title && title.kind === "title" ? (
          <h2 className="text-xl font-semibold tracking-tight text-ink">{title.text}</h2>
        ) : null}
        {out}
      </Card>
    </div>
  );
}
