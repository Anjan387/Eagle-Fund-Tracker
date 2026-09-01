"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { deleteNote, getHoldingById, upsertNote } from "@/lib/store";

export interface NoteFormState {
  error?: string;
  ok?: boolean;
}

export async function saveNote(
  _prev: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  const user = await requireUser();
  const holdingId = String(formData.get("holdingId") ?? "");
  const noteId = String(formData.get("noteId") ?? "").trim() || undefined;
  const body = String(formData.get("body") ?? "").trim();

  if (!(await getHoldingById(holdingId))) return { error: "Unknown holding." };
  if (body.length < 3) return { error: "Note is empty." };

  await upsertNote({ noteId, holdingId, author: user.id, body });
  revalidatePath("/holdings");
  return { ok: true };
}

export async function removeNote(formData: FormData): Promise<void> {
  await requireUser();
  const noteId = String(formData.get("noteId") ?? "");
  if (noteId) await deleteNote(noteId);
  revalidatePath("/holdings");
}
