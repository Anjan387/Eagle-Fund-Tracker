"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  attachFileToProposal,
  removeAttachment,
  type AttachmentFormState,
} from "@/app/actions/proposals";
import { FieldError, SubmitButton } from "@/components/ui";
import { fileSize, relativeTime } from "@/lib/format";

export interface AttachmentView {
  id: string;
  fileName: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: string;
}

const initial: AttachmentFormState = {};

export function AttachmentsPanel({
  proposalId,
  attachments,
  currentUserId,
  canModerate,
}: {
  proposalId: string;
  attachments: AttachmentView[];
  currentUserId: string;
  canModerate: boolean;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
      {attachments.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface-2 px-3 py-1.5 text-xs"
            >
              <a
                href={`/api/attachments/${a.id}`}
                className="min-w-0 truncate font-medium text-brand hover:underline"
                title={a.fileName}
              >
                {a.fileName}
              </a>
              <span className="flex shrink-0 items-center gap-2 text-faint">
                <span className="tnum">{fileSize(a.sizeBytes)}</span>
                <span>
                  {a.uploadedByName} · {relativeTime(a.createdAt)}
                </span>
                {a.uploadedBy === currentUserId || canModerate ? (
                  <form action={removeAttachment}>
                    <input type="hidden" name="attachmentId" value={a.id} />
                    <input type="hidden" name="uploadedBy" value={a.uploadedBy} />
                    <button type="submit" className="hover:text-neg">
                      Remove
                    </button>
                  </form>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : !adding ? (
        <p className="text-xs text-faint">No attachments yet.</p>
      ) : null}

      {adding ? (
        <UploadForm proposalId={proposalId} onDone={() => setAdding(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="self-start text-xs text-muted hover:text-ink"
        >
          + Attach a file
        </button>
      )}
    </div>
  );
}

function UploadForm({ proposalId, onDone }: { proposalId: string; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(attachFileToProposal, initial);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      onDone();
    }
  }, [state.ok, onDone]);

  return (
    <form ref={ref} action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="proposalId" value={proposalId} />
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          name="file"
          required
          className="max-w-full flex-1 text-xs text-muted file:mr-2 file:rounded file:border-0 file:bg-brand file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-brand-contrast hover:file:bg-brand-hover"
        />
        <SubmitButton pending={pending} className="px-3 py-1.5 text-xs">
          Upload
        </SubmitButton>
        <button type="button" onClick={onDone} className="px-1 text-xs text-muted hover:text-ink">
          Cancel
        </button>
      </div>
      <FieldError>{state.error}</FieldError>
      <p className="text-[11px] text-faint">Any file type — Excel, PDF, Word, etc. — up to 25MB.</p>
    </form>
  );
}
