"use client";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { cn } from "@/components/ui";
import { THESIS_TEMPLATE, type ThesisNode } from "@/lib/decision-types";
import styles from "./decisions.module.css";

/**
 * The thesis rich-text editor. A new thesis starts from the prompted sections
 * (THESIS_TEMPLATE); the document is kept as JSON, never as HTML. Loaded on
 * demand (see Fields.tsx) so the editor library is only downloaded when
 * someone actually writes.
 */
export default function ThesisEditor({
  value,
  onChange,
}: {
  value: ThesisNode | null;
  onChange: (doc: ThesisNode) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true },
      }),
    ],
    content: value ?? THESIS_TEMPLATE,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true, // keeps the toolbar's pressed states current
    editorProps: { attributes: { role: "textbox", "aria-multiline": "true", "aria-label": "Thesis" } },
    onUpdate: ({ editor }) => onChange(editor.getJSON() as ThesisNode),
  });

  return (
    <div className="rounded-md border border-line-strong bg-surface focus-within:border-brand">
      <div
        role="toolbar"
        aria-label="Formatting"
        className="flex flex-wrap gap-1 border-b border-line px-2 py-1.5"
      >
        {editor ? <Tools editor={editor} /> : <span className="px-2 py-1 text-xs text-faint">Loading editor…</span>}
      </div>
      <EditorContent editor={editor} className={cn(styles.prose, "px-4 py-3")} />
    </div>
  );
}

function Tools({ editor }: { editor: Editor }) {
  const chain = () => editor.chain().focus();
  return (
    <>
      <Tool label="Bold" active={editor.isActive("bold")} onClick={() => chain().toggleBold().run()}>
        <strong>B</strong>
      </Tool>
      <Tool label="Italic" active={editor.isActive("italic")} onClick={() => chain().toggleItalic().run()}>
        <em>I</em>
      </Tool>
      <Tool
        label="Section heading"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => chain().toggleHeading({ level: 3 }).run()}
      >
        Heading
      </Tool>
      <Tool label="Bulleted list" active={editor.isActive("bulletList")} onClick={() => chain().toggleBulletList().run()}>
        • List
      </Tool>
      <Tool
        label="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => chain().toggleOrderedList().run()}
      >
        1. List
      </Tool>
      <Tool label="Quote" active={editor.isActive("blockquote")} onClick={() => chain().toggleBlockquote().run()}>
        Quote
      </Tool>
      <span aria-hidden className="mx-1 w-px self-stretch bg-line" />
      <Tool label="Undo" disabled={!editor.can().undo()} onClick={() => chain().undo().run()}>
        Undo
      </Tool>
      <Tool label="Redo" disabled={!editor.can().redo()} onClick={() => chain().redo().run()}>
        Redo
      </Tool>
    </>
  );
}

function Tool({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded px-2 py-1 text-xs transition-colors disabled:opacity-40",
        active ? "bg-brand/10 font-medium text-brand" : "text-muted hover:bg-surface-2 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
