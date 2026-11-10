import { finishDocumentUpload, startDocumentUpload } from "@/app/actions/decisions";
import { DOCUMENT_KINDS, extensionOf, MAX_DOCUMENT_BYTES } from "@/lib/decision-types";

/** Why a file can't be filed, or null if it can. Checked again on the server. */
export function fileProblem(file: File): string | null {
  if (!DOCUMENT_KINDS[extensionOf(file.name)]) return "not a PDF, Excel, PowerPoint, Word or image file";
  if (file.size > MAX_DOCUMENT_BYTES) return `larger than ${MAX_DOCUMENT_BYTES / (1024 * 1024)}MB`;
  if (file.size === 0) return "empty";
  return null;
}

/**
 * Files one document under a decision: asks the server for a one-off upload
 * token, sends the file straight from the browser to Storage (so its size is
 * not limited by the app's own server), then has the server record it.
 * Returns an error message, or null when it worked.
 */
export async function uploadDocument(decisionId: string, file: File, note: string | null): Promise<string | null> {
  try {
    const start = await startDocumentUpload({ decisionId, fileName: file.name, sizeBytes: file.size });
    if (!start.ok) return start.error;

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
    );
    const { error } = await supabase.storage
      .from(start.bucket)
      .uploadToSignedUrl(start.path, start.token, file, { contentType: file.type || "application/octet-stream" });
    if (error) return error.message;

    const done = await finishDocumentUpload({ decisionId, path: start.path, fileName: file.name, note });
    return done.ok ? null : done.error;
  } catch (e) {
    return e instanceof Error ? e.message : "The upload failed.";
  }
}
