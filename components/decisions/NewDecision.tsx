"use client";

import { useState } from "react";
import { saveDecision } from "@/app/actions/decisions";
import { cn, FieldError, inputClass, SubmitButton } from "@/components/ui";
import { fileSize, longDate, money2 } from "@/lib/format";
import { STATUS_LABEL, thesisIsEmpty } from "@/lib/decision-types";
import { DropZone, FileKind } from "./DocumentsPanel";
import { BasicsFields, ThesisFields, type FieldOptions } from "./Fields";
import { emptyForm, fromForm, missingRequired, type DecisionForm } from "./form";
import { fileProblem, uploadDocument } from "./upload";

const STEPS = ["Basics", "Thesis", "Documents", "Check and save"];

/**
 * Files a new decision in four steps. Only the ticker, Buy/Sell, the date and
 * the one-line summary are required, so a draft can be saved straight away.
 * Documents chosen in step 3 are uploaded once the decision itself is saved.
 */
export function NewDecision({
  options,
  onCreated,
  onCancel,
}: {
  options: FieldOptions;
  onCreated: (id: string, failedUploads: string[]) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<DecisionForm>(emptyForm);
  const [files, setFiles] = useState<{ file: File; note: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const set = (patch: Partial<DecisionForm>) => setForm((f) => ({ ...f, ...patch }));

  function go(to: number) {
    const missing = to > 0 ? missingRequired(form) : null;
    if (missing) {
      setError(missing);
      return setStep(0);
    }
    setError(null);
    setStep(to);
  }

  function addFiles(chosen: File[]) {
    const problems: string[] = [];
    const ok: { file: File; note: string }[] = [];
    for (const file of chosen) {
      const problem = fileProblem(file);
      if (problem) problems.push(`${file.name}: ${problem}`);
      else ok.push({ file, note: "" });
    }
    setFiles((f) => [...f, ...ok]);
    setError(problems.length ? problems.join(" · ") : null);
  }

  async function save() {
    const missing = missingRequired(form);
    if (missing) {
      setError(missing);
      return setStep(0);
    }
    setProgress("Saving the decision…");
    const result = await saveDecision(null, fromForm(form));
    if (!result.ok) {
      setProgress(null);
      return setError(result.error);
    }
    const failed: string[] = [];
    for (const [i, { file, note }] of files.entries()) {
      setProgress(`Uploading document ${i + 1} of ${files.length}…`);
      const problem = await uploadDocument(result.id, file, note.trim() || null);
      if (problem) failed.push(`${file.name}: ${problem}`);
    }
    onCreated(result.id, failed);
  }

  const sleeve = options.strategies.find((s) => s.id === form.strategyId)?.name;

  return (
    <div className="flex flex-col gap-5">
      <ol className="flex flex-wrap gap-x-2 gap-y-2 text-xs">
        {STEPS.map((name, i) => (
          <li key={name} className="flex items-center gap-2">
            <button
              type="button"
              aria-current={i === step ? "step" : undefined}
              onClick={() => go(i)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 transition-colors",
                i === step
                  ? "border-brand/30 bg-brand/10 font-medium text-brand"
                  : "border-line-strong text-muted hover:bg-surface-2 hover:text-ink",
              )}
            >
              <span className="tnum">{i + 1}</span>
              {name}
            </button>
            {i < STEPS.length - 1 ? <span aria-hidden className="text-faint">›</span> : null}
          </li>
        ))}
      </ol>

      <FieldError>{error}</FieldError>

      <div className="rounded-lg border border-line bg-surface p-4 sm:p-6">
        {step === 0 ? <BasicsFields form={form} set={set} options={options} /> : null}
        {step === 1 ? <ThesisFields form={form} set={set} /> : null}
        {step === 2 ? (
          <div className="flex flex-col gap-4">
            <DropZone onFiles={addFiles} />
            {files.length ? (
              <ul className="divide-y divide-line rounded-lg border border-line">
                {files.map(({ file, note }, i) => (
                  <li key={`${file.name}-${i}`} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                    <FileKind fileName={file.name} />
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-medium text-ink">{file.name}</p>
                      <p className="text-xs text-muted">{fileSize(file.size)}</p>
                    </div>
                    <input
                      value={note}
                      onChange={(e) => setFiles((all) => all.map((f, j) => (j === i ? { ...f, note: e.target.value } : f)))}
                      maxLength={300}
                      aria-label={`Note for ${file.name}`}
                      placeholder="Short note (optional)"
                      className={cn(inputClass, "py-1.5 text-xs sm:w-64")}
                    />
                    <button
                      type="button"
                      onClick={() => setFiles((all) => all.filter((_, j) => j !== i))}
                      className="shrink-0 text-xs text-neg hover:underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted">Nothing chosen yet. Documents can also be added after the decision is saved.</p>
            )}
          </div>
        ) : null}
        {step === 3 ? (
          <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
            {(
              [
                ["Decision", `${form.action === "buy" ? "Buy" : "Sell"} ${form.ticker.trim().toUpperCase() || "—"}`],
                ["Decision date", form.decisionDate ? longDate(form.decisionDate) : "—"],
                ["Status", STATUS_LABEL[form.status]],
                ["Strategy sleeve", sleeve ?? "Not set"],
                ["Shares", form.shares || "Not set"],
                ["Price at decision", form.price ? money2(Number(form.price)) : "Not set"],
                ["Thesis", thesisIsEmpty(form.thesis) ? "Not written yet" : "Written"],
                ["Documents", files.length ? files.map((f) => f.file.name).join(", ") : "None"],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-faint">{label}</dt>
                <dd className="mt-1 break-words text-ink">{value}</dd>
              </div>
            ))}
            <div className="sm:col-span-2">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-faint">Thesis summary</dt>
              <dd className="mt-1 text-ink">{form.thesisSummary || "—"}</dd>
            </div>
          </dl>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SubmitButton type="button" variant="ghost" onClick={onCancel} disabled={progress !== null}>
          Cancel
        </SubmitButton>
        <div className="flex flex-wrap items-center gap-2">
          {progress ? <span role="status" className="text-xs text-muted">{progress}</span> : null}
          {step > 0 ? (
            <SubmitButton type="button" variant="ghost" onClick={() => go(step - 1)} disabled={progress !== null}>
              Back
            </SubmitButton>
          ) : null}
          {step < STEPS.length - 1 ? (
            <>
              <SubmitButton type="button" variant="ghost" onClick={save} disabled={progress !== null}>
                Save as is
              </SubmitButton>
              <SubmitButton type="button" onClick={() => go(step + 1)} disabled={progress !== null}>
                Next
              </SubmitButton>
            </>
          ) : (
            <SubmitButton type="button" onClick={save} disabled={progress !== null}>
              Save decision
            </SubmitButton>
          )}
        </div>
      </div>
    </div>
  );
}
