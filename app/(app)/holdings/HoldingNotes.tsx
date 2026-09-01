"use client";

import { useActionState, useEffect, useState } from "react";
import { removeNote, saveNote, type NoteFormState } from "@/app/actions/notes";
import { cn, inputClass, SubmitButton } from "@/components/ui";
import { relativeTime } from "@/lib/format";

export interface NoteView {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  updatedAt: string;
}

const initial: NoteFormState = {};

export function HoldingNotes({
  holdingId,
  notes,
  currentUserId,
  canModerate,
}: {
  holdingId: string;
  notes: NoteView[];
  currentUserId: string;
  canModerate: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {notes.length === 0 && !adding ? (
        <p className="text-xs text-faint">No thesis notes yet.</p>
      ) : null}

      {notes.map((note) =>
        editingId === note.id ? (
          <NoteForm
            key={note.id}
            holdingId={holdingId}
            noteId={note.id}
            defaultBody={note.body}
            onDone={() => setEditingId(null)}
          />
        ) : (
          <div key={note.id} className="rounded-md border border-line bg-surface-2 px-3 py-2.5">
            <p className="whitespace-pre-wrap text-sm text-ink">{note.body}</p>
            <div className="mt-2 flex items-center justify-between text-[11px] text-faint">
              <span>
                {note.authorName} · updated {relativeTime(note.updatedAt)}
              </span>
              {note.authorId === currentUserId || canModerate ? (
                <span className="flex gap-2">
                  {note.authorId === currentUserId ? (
                    <button
                      type="button"
                      className="hover:text-ink"
                      onClick={() => setEditingId(note.id)}
                    >
                      Edit
                    </button>
                  ) : null}
                  <form action={removeNote}>
                    <input type="hidden" name="noteId" value={note.id} />
                    <button type="submit" className="hover:text-neg">
                      Delete
                    </button>
                  </form>
                </span>
              ) : null}
            </div>
          </div>
        ),
      )}

      {adding ? (
        <NoteForm holdingId={holdingId} onDone={() => setAdding(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="self-start rounded-md border border-line-strong px-2.5 py-1.5 text-xs text-muted hover:bg-surface-2 hover:text-ink"
        >
          + Add note
        </button>
      )}
    </div>
  );
}

function NoteForm({
  holdingId,
  noteId,
  defaultBody = "",
  onDone,
}: {
  holdingId: string;
  noteId?: string;
  defaultBody?: string;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveNote, initial);

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="holdingId" value={holdingId} />
      {noteId ? <input type="hidden" name="noteId" value={noteId} /> : null}
      <textarea
        name="body"
        rows={3}
        defaultValue={defaultBody}
        autoFocus
        placeholder="Thesis, entry rationale, exit rule, what you're watching…"
        className={cn(inputClass, "resize-y")}
      />
      {state.error ? <p className="text-xs text-neg">{state.error}</p> : null}
      <div className="flex gap-2">
        <SubmitButton pending={pending} className="px-3 py-1.5 text-xs">
          {noteId ? "Save changes" : "Save note"}
        </SubmitButton>
        <button
          type="button"
          onClick={onDone}
          className="rounded-md px-3 py-1.5 text-xs text-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
