import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const { data, error } = await supabase
    .from("inventory")
    .select("content, updated_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ content: "", updated_at: null });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { content } = await request.json();

  // Upsert
  const { data, error } = await supabase
    .from("inventory")
    .upsert({ content, updated_at: new Date().toISOString() }, { onConflict: "id" })
    .select("content, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
