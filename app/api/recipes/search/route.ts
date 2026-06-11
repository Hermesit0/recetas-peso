import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";

  const { data, error } = await supabase
    .from("recipes")
    .select("id, title, calories, ingredients, process, image_query")
    .ilike("title", `%${q}%`)
    .order("title");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
