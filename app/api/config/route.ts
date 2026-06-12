import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

// GET /api/config — devuelve todos los valores de config
export async function GET() {
  const { data, error } = await supabase
    .from("app_config")
    .select("key, value")
    .order("key");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Devolver como dict { key: value }
  const config: Record<string, string> = {};
  for (const row of data || []) {
    config[row.key] = row.value;
  }

  return NextResponse.json(config);
}

// PUT /api/config — guarda valores (key única)
export async function PUT(request: Request) {
  const body = await request.json();
  const { key, value } = body;

  if (!key || typeof value !== "string") {
    return NextResponse.json({ error: "key y value son requeridos" }, { status: 400 });
  }

  const { error } = await supabase
    .from("app_config")
    .upsert({ key, value }, { onConflict: "key" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, key, value });
}
