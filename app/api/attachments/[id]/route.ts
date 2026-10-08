import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDownloadUrl } from "@/lib/attachments";

// Issues a fresh, short-lived signed Storage URL on every click and redirects
// to it, rather than embedding one directly in the page (which could expire
// while the page sits open). Signed-in users only.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const result = await getDownloadUrl(id);
  if (!result) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.redirect(result.url);
}
