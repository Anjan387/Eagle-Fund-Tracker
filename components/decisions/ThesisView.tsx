import { createElement, Fragment, type ReactNode } from "react";
import { cn } from "@/components/ui";
import type { ThesisNode } from "@/lib/decision-types";
import styles from "./decisions.module.css";

// Read-only rendering of a thesis document. It builds React elements from the
// editor's JSON one known node type at a time, so nothing a person typed or
// pasted is ever treated as HTML.

const SAFE_LINK = /^(https?:\/\/|mailto:)/i;

function marked(node: ThesisNode): ReactNode {
  let out: ReactNode = node.text ?? "";
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") out = <strong>{out}</strong>;
    else if (mark.type === "italic") out = <em>{out}</em>;
    else if (mark.type === "underline") out = <u>{out}</u>;
    else if (mark.type === "strike") out = <s>{out}</s>;
    else if (mark.type === "code") out = <code>{out}</code>;
    else if (mark.type === "link") {
      const href = String(mark.attrs?.href ?? "");
      if (SAFE_LINK.test(href)) {
        out = (
          <a href={href} target="_blank" rel="noopener noreferrer nofollow">
            {out}
          </a>
        );
      }
    }
  }
  return out;
}

function render(node: ThesisNode, key: number): ReactNode {
  const children = node.content?.map(render);
  switch (node.type) {
    case "text":
      return <Fragment key={key}>{marked(node)}</Fragment>;
    case "paragraph":
      return <p key={key}>{children}</p>;
    case "heading":
      return createElement(node.attrs?.level === 2 ? "h2" : "h3", { key }, children);
    case "bulletList":
      return <ul key={key}>{children}</ul>;
    case "orderedList":
      return <ol key={key}>{children}</ol>;
    case "listItem":
      return <li key={key}>{children}</li>;
    case "blockquote":
      return <blockquote key={key}>{children}</blockquote>;
    case "codeBlock":
      return (
        <pre key={key}>
          <code>{children}</code>
        </pre>
      );
    case "horizontalRule":
      return <hr key={key} />;
    case "hardBreak":
      return <br key={key} />;
    default: // "doc", or anything unknown: just its children
      return <Fragment key={key}>{children}</Fragment>;
  }
}

export function ThesisView({ doc, className }: { doc: ThesisNode; className?: string }) {
  return <div className={cn(styles.prose, className)}>{render(doc, 0)}</div>;
}
