import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const { data, error } = await supabase
    .from("weight_entries")
    .select("id, weight_kg, recorded_at")
    .order("recorded_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const { weight_kg } = await request.json();

  if (!weight_kg || typeof weight_kg !== "number") {
    return NextResponse.json({ error: "weight_kg required" }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("weight_entries")
    .upsert(
      { weight_kg, recorded_at: today },
      { onConflict: "recorded_at" }
    )
    .select("id, weight_kg, recorded_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
