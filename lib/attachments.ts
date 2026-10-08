// Proposal attachments — files live in the private "proposal-attachments"
// Storage bucket (25MB/file, no type restriction); this table just tracks
// which file belongs to which proposal. Downloads always go through a
// short-lived signed URL with `download` set, so the browser is forced to
// save the file under its real name rather than ever rendering it inline —
// that's what keeps an uploaded HTML/SVG file from being able to run as a
// page on the app's own origin.

import "server-only";
import { admin } from "./supabase/admin";
import { rowToAttachment } from "./db-map";
import type { ProposalAttachment } from "./types";

const BUCKET = "proposal-attachments";
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // matches the bucket's own limit

function must<T>(data: T | null, error: { message: string } | null, what: string): T {
  if (error) throw new Error(`${what}: ${error.message}`);
  if (data === null) throw new Error(`${what}: no data`);
  return data;
}

export async function getAttachments(proposalId: string): Promise<ProposalAttachment[]> {
  const { data, error } = await admin()
    .from("proposal_attachments")
    .select("*")
    .eq("proposal_id", proposalId)
    .order("created_at", { ascending: false });
  return must(data, error, "getAttachments").map(rowToAttachment);
}

export async function uploadAttachment(input: {
  proposalId: string;
  file: File;
  uploadedBy: string;
}): Promise<ProposalAttachment> {
  const ext = input.file.name.includes(".") ? input.file.name.split(".").pop() : undefined;
  const storagePath = `${input.proposalId}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;

  const { error: uploadError } = await admin()
    .storage.from(BUCKET)
    .upload(storagePath, input.file, {
      contentType: input.file.type || "application/octet-stream",
      upsert: false,
    });
  if (uploadError) throw new Error(`uploadAttachment (storage): ${uploadError.message}`);

  const { data, error } = await admin()
    .from("proposal_attachments")
    .insert({
      proposal_id: input.proposalId,
      storage_path: storagePath,
      file_name: input.file.name,
      content_type: input.file.type || null,
      size_bytes: input.file.size,
      uploaded_by: input.uploadedBy,
    })
    .select("*")
    .single();

  if (error) {
    // don't leave an orphaned file behind if the metadata row failed
    await admin().storage.from(BUCKET).remove([storagePath]);
    throw new Error(`uploadAttachment (db): ${error.message}`);
  }
  return rowToAttachment(data);
}

/** A short-lived signed URL that forces a download under the original filename. */
export async function getDownloadUrl(attachmentId: string): Promise<{ url: string; fileName: string } | null> {
  const { data } = await admin()
    .from("proposal_attachments")
    .select("*")
    .eq("id", attachmentId)
    .maybeSingle();
  if (!data) return null;
  const attachment = rowToAttachment(data);

  const { data: signed, error } = await admin()
    .storage.from(BUCKET)
    .createSignedUrl(attachment.storagePath, 60, { download: attachment.fileName });
  if (error || !signed) return null;
  return { url: signed.signedUrl, fileName: attachment.fileName };
}

export async function deleteAttachment(attachmentId: string): Promise<void> {
  const { data } = await admin()
    .from("proposal_attachments")
    .select("storage_path")
    .eq("id", attachmentId)
    .maybeSingle();
  await admin().from("proposal_attachments").delete().eq("id", attachmentId);
  if (data?.storage_path) {
    await admin().storage.from(BUCKET).remove([data.storage_path]);
  }
}
