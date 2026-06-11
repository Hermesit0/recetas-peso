import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

const LLM_PROMPT = `Eres un asistente que parsea listas de ingredientes de cocina. Convierte texto libre en JSON estructurado.

Devuelve SOLO un array JSON de objetos con esta estructura exacta, sin texto adicional:
[
  {"item": "nombre del ingrediente en español, minúsculas", "quantity": número en gramos o ml, "unit": "g" o "ml"}
]

REGLAS:
- Cantidades siempre en GRAMOS (g) o MILILITROS (ml), NUNCA cucharadas, tazas, cucharadas ni unidades imperiales
- Convierte cantidades aproximadas: "un poco de" → 10g, "una pizca" → 2g, "medio vaso" → 80ml, etc.
- Cantidades desconocidas pero seguras usa 50g para sólidos, 30ml para líquidos
- Ingredientes sin cantidad clara (especias, hierbas): cantidad = 0, unit = "g"
- Devuelve TODOS los ingredientes mencionados, sin inventar cantidades exactas si no se dan
- Si el texto está vacío o no hay ingredientes, devuelve []
- Solo JSON válido, sin markdown, sin comentarios

Ejemplos:
- "500g de arroz, pollo 300g, salsa soja 50ml" → [{"item":"arroz","quantity":500,"unit":"g"},{"item":"pollo","quantity":300,"unit":"g"},{"item":"salsa soja","quantity":50,"unit":"ml"}]
- "tengo tofu, gengibre, cebolla" → [{"item":"tofu","quantity":50,"unit":"g"},{"item":"gengibre","quantity":0,"unit":"g"},{"item":"cebolla","quantity":0,"unit":"g"}]`;

interface InventoryItem {
  item: string;
  quantity: number;
  unit: string;
}

export async function GET() {
  const { data, error } = await supabase
    .from("inventory")
    .select("content, updated_at, items")
    .single();

  if (error || !data) {
    return NextResponse.json({ content: "", updated_at: null, items: [] });
  }

  return NextResponse.json({
    content: data.content ?? "",
    updated_at: data.updated_at,
    items: data.items ?? [],
  });
}

export async function POST(request: Request) {
  const { content } = await request.json();

  if (!content || content.trim() === "") {
    // Reset inventory
    const { data, error } = await supabase
      .from("inventory")
      .upsert(
        { content: "", updated_at: new Date().toISOString(), items: [] },
        { onConflict: "id" }
      )
      .select("content, updated_at, items")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  }

  // Call OpenRouter LLM to parse the inventory text
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY no configurada" }, { status: 500 });
  }

  const llmRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: LLM_PROMPT },
        { role: "user", content: `Parsea este texto de inventario:\n${content}` },
      ],
      max_tokens: 1024,
      temperature: 0.1,
    }),
  });

  if (!llmRes.ok) {
    const errText = await llmRes.text();
    return NextResponse.json(
      { error: `LLM error: ${llmRes.status} - ${errText}` },
      { status: 500 }
    );
  }

  const llmData = await llmRes.json();
  const raw = llmData.choices?.[0]?.message?.content ?? "[]";

  let items: InventoryItem[] = [];
  try {
    // Try to extract JSON from response (might have surrounding text)
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      items = JSON.parse(jsonMatch[0]);
    } else {
      items = JSON.parse(raw);
    }
    if (!Array.isArray(items)) items = [];
  } catch {
    // Fallback: try line-by-line parsing
    items = [];
  }

  // Upsert with both raw text and parsed items
  const { data, error } = await supabase
    .from("inventory")
    .upsert(
      {
        content,
        updated_at: new Date().toISOString(),
        items: items as unknown as PostgresJson,
      },
      { onConflict: "id" }
    )
    .select("content, updated_at, items")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// Helper type for Supabase JSON
type PostgresJson = null | string | number | boolean | PostgresJson[] | { [key: string]: PostgresJson };
