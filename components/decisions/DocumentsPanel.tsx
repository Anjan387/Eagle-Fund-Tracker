"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { removeDocument, saveDocumentNote } from "@/app/actions/decisions";
import { cn, EmptyState, FieldError, inputClass } from "@/components/ui";
import { fileSize, longDate } from "@/lib/format";
import {
  DOCUMENT_ACCEPT,
  DOCUMENT_KINDS,
  extensionOf,
  previewKind,
  type DecisionDocument,
} from "@/lib/decision-types";
import { fileProblem, uploadDocument } from "./upload";

const KIND_TONE = {
  pdf: "bg-neg-soft text-neg border-neg/25",
  sheet: "bg-pos-soft text-pos border-pos/25",
  slides: "bg-warn-soft text-warn border-warn/30",
  doc: "bg-brand/10 text-brand border-brand/20",
  image: "bg-gold-soft text-gold border-gold/30",
} as const;

/** The small coloured label that stands in for a file-type icon. */
export function FileKind({ fileName }: { fileName: string }) {
  const kind = DOCUMENT_KINDS[extensionOf(fileName)];
  return (
    <span
      aria-hidden
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-md border font-mono text-[10px] font-semibold",
        kind ? KIND_TONE[kind.kind] : "border-line bg-surface-2 text-muted",
      )}
    >
      {kind?.label ?? "FILE"}
    </span>
  );
}

/** A drop target that also opens the file picker on click or Enter. */
export function DropZone({ onFiles, busy }: { onFiles: (files: File[]) => void; busy?: boolean }) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    if (e.dataTransfer.files.length) onFiles([...e.dataTransfer.files]);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cn(
        "rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors",
        over ? "border-brand bg-brand/5" : "border-line-strong",
      )}
    >
      <p className="text-sm text-ink">Drag files here, or</p>
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="mt-2 rounded-md border border-line-strong bg-surface px-3.5 py-2 text-sm font-medium text-ink hover:bg-surface-2 disabled:opacity-60"
      >
        {busy ? "Uploading…" : "Choose files"}
      </button>
      <p className="mt-2 text-xs text-muted">PDF, Excel, PowerPoint, Word or images, up to 50MB each.</p>
      <input
        ref={input}
        type="file"
        multiple
        accept={DOCUMENT_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          if (e.target.files?.length) onFiles([...e.target.files]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function DocumentsPanel({
  decisionId,
  documents,
  people,
  me,
}: {
  decisionId: string;
  documents: DecisionDocument[];
  people: Record<string, string>;
  me: { id: string; role: string };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [preview, setPreview] = useState<DecisionDocument | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (preview && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [preview]);

  async function addFiles(files: File[]) {
    setBusy(true);
    const failed: string[] = [];
    for (const file of files) {
      const problem = fileProblem(file) ?? (await uploadDocument(decisionId, file, null));
      if (problem) failed.push(`${file.name}: ${problem}`);
    }
    setProblems(failed);
    setBusy(false);
    router.refresh();
  }

  async function saveNote(id: string) {
    const result = await saveDocumentNote(id, note);
    if (!result.ok) return setProblems([result.error]);
    setEditing(null);
    router.refresh();
  }

  async function remove(doc: DecisionDocument) {
    if (!window.confirm(`Remove "${doc.fileName}" from this decision? This can't be undone.`)) return;
    const result = await removeDocument(doc.id);
    if (!result.ok) return setProblems([result.error]);
    router.refresh();
  }

  const kind = preview ? previewKind(preview.contentType) : null;

  return (
    <div className="flex flex-col gap-4">
      <DropZone onFiles={addFiles} busy={busy} />
      {problems.length ? (
        <FieldError>
          {problems.map((p) => (
            <span key={p} className="block">
              {p}
            </span>
          ))}
        </FieldError>
      ) : null}

      {documents.length === 0 ? (
        <EmptyState title="No documents filed yet" hint="Models, decks, filings and notes for this decision go here." />
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {documents.map((doc) => (
            <li key={doc.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start">
              <FileKind fileName={doc.fileName} />
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-medium text-ink">{doc.fileName}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {fileSize(doc.sizeBytes)} · uploaded {longDate(doc.createdAt.slice(0, 10))} by{" "}
                  {people[doc.uploadedBy ?? ""] ?? "Unknown"}
                </p>
                {editing === doc.id ? (
                  <div className="mt-2 flex gap-2">
                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      maxLength={300}
                      aria-label={`Note for ${doc.fileName}`}
                      placeholder="What this file is"
                      className={cn(inputClass, "py-1.5 text-xs")}
                    />
                    <button type="button" onClick={() => saveNote(doc.id)} className="text-xs font-medium text-brand hover:underline">
                      Save
                    </button>
                    <button type="button" onClick={() => setEditing(null)} className="text-xs text-muted hover:underline">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-ink">
                    {doc.note ? <span>{doc.note} </span> : null}
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(doc.id);
                        setNote(doc.note ?? "");
                      }}
                      className="text-muted hover:text-ink hover:underline"
                    >
                      {doc.note ? "Edit note" : "Add a note"}
                    </button>
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs">
                {previewKind(doc.contentType) ? (
                  <button type="button" onClick={() => setPreview(doc)} className="font-medium text-brand hover:underline">
                    Preview
                  </button>
                ) : null}
                <a href={`/api/decision-documents/${doc.id}`} className="font-medium text-brand hover:underline">
                  Download
                </a>
                {me.role === "advisor" || doc.uploadedBy === me.id ? (
                  <button type="button" onClick={() => remove(doc)} className="text-neg hover:underline">
                    Remove
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <dialog
        ref={dialog}
        aria-label={preview ? `Preview of ${preview.fileName}` : undefined}
        onClose={() => setPreview(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className="m-auto h-[88vh] w-[calc(100%-2rem)] max-w-5xl overflow-hidden rounded-xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/60"
      >
        {preview ? (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <p className="min-w-0 truncate text-sm font-medium">{preview.fileName}</p>
              <div className="flex shrink-0 items-center gap-3 text-xs">
                <a href={`/api/decision-documents/${preview.id}`} className="font-medium text-brand hover:underline">
                  Download
                </a>
                <form method="dialog">
                  <button
                    type="submit"
                    aria-label="Close preview"
                    className="grid h-8 w-8 place-items-center rounded-md border border-line-strong text-muted hover:bg-surface-2 hover:text-ink"
                  >
                    ✕
                  </button>
                </form>
              </div>
            </div>
            {kind === "pdf" ? (
              <iframe
                src={`/api/decision-documents/${preview.id}?inline=1`}
                title={preview.fileName}
                className="min-h-0 w-full flex-1 bg-surface-2"
              />
            ) : (
              <div className="grid min-h-0 flex-1 place-items-center overflow-auto bg-surface-2 p-4">
                <img
                  src={`/api/decision-documents/${preview.id}?inline=1`}
                  alt={preview.note || preview.fileName}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            )}
          </div>
        ) : null}
      </dialog>
    </div>
  );
}
