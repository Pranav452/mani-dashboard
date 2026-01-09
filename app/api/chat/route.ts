import { NextRequest, NextResponse } from "next/server";

// Phase 1: Chat is disabled.
// This endpoint intentionally does NOT talk to any database,
// LangChain model, or Supabase. It only returns a static message
// so the frontend can render a graceful "coming soon" experience.

export async function POST(req: NextRequest) {
  // Consume the body if present but ignore its content to stay future-proof.
  try {
    await req.json();
  } catch {
    // ignore invalid / empty JSON
  }

  return NextResponse.json({
    answer:
      "The Logistics AI chat is currently disabled while the new backend is being built. The chat UI is a visual shell only and no data or AI is being queried.",
    sql_query: null,
  });
}
