import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDocumentById, getDocumentUrl } from "@/lib/decisions";
import { previewKind } from "@/lib/decision-types";

// One Decision Log document. Issues a fresh, short-lived signed Storage URL on
// every request and redirects to it. By default the URL forces a download
// under the original file name; `?inline=1` lets the browser show the file
// instead, and is honoured only for PDFs and images — so an uploaded HTML or
// SVG file can never be opened as a page. Signed-in users only.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const doc = await getDocumentById(id);
  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });

  const inline = request.nextUrl.searchParams.get("inline") === "1" && previewKind(doc.contentType) !== null;
  const url = await getDocumentUrl(doc.storagePath, doc.fileName, inline);
  if (!url) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.redirect(url);
}
