import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

interface GenerateMealRequest {
  startDate: string; // "YYYY-MM-DD"
  days: number; // 1 = day, 7 = week, 30 = month
}

export async function POST(request: Request) {
  const { startDate, days }: GenerateMealRequest = await request.json();

  if (!startDate || !days) {
    return NextResponse.json({ error: "startDate y days son requeridos" }, { status: 400 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY no configurada" }, { status: 500 });
  }

  // Load config from DB
  const { data: configData, error: configErr } = await supabase
    .from("app_config")
    .select("key, value");

  if (configErr) {
    return NextResponse.json({ error: "No se pudo leer la config: " + configErr.message }, { status: 500 });
  }

  const config: Record<string, string> = {};
  for (const row of configData || []) {
    config[row.key] = row.value;
  }

  const SYSTEM_PROMPT = config.recipe_system_prompt || "Eres un chef nutricional especializado en cocina oriental Saludable, bajas en calorías (max 500 kcal por comida), máximo 15 ingredientes, proceso claro de 3-5 pasos, todo en sistema métrico. Generas en formato JSON exacto.";
  const USER_PROMPT_TEMPLATE = config.recipe_user_prompt || "Genera {totalSlots} recetas orientales...";
  const LLM_MODEL = config.llm_model || "deepseek/deepseek-v4-pro";

  // Count how many recipes we already have
  const { count: existingCount } = await supabase
    .from("recipes")
    .select("*", { count: "exact", head: true });

  const slotsPerDay = 2; // 09:00 and 12:00
  const totalSlots = days * slotsPerDay;

  // Fill in placeholders
  const userPrompt = USER_PROMPT_TEMPLATE
    .replace("{totalSlots}", String(totalSlots))
    .replace("{existingCount}", String(existingCount ?? 0))
    .replace("{startDate}", startDate)
    .replace("{days}", String(days));

  const llmRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 4096,
      temperature: 0.7,
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
  const raw = llmData.choices?.[0]?.message?.content ?? "";

  // Parse recipes from LLM response
  let recipes: Array<{
    title: string;
    image_url: string;
    calories: number;
    ingredients: string;
    process: string;
    meal_type: string;
  }> = [];

  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      recipes = JSON.parse(jsonMatch[0]);
    } else {
      recipes = JSON.parse(raw);
    }
    if (!Array.isArray(recipes)) recipes = [];
  } catch {
    return NextResponse.json(
      { error: "No se pudo parsear las recetas del LLM", raw: raw.substring(0, 500) },
      { status: 500 }
    );
  }

  // Insert recipes into DB and build meal plan
  const insertedRecipes: Array<{ id: string; title: string; calories: number; meal_time: string; date: string }> = [];

  for (let day = 0; day < days; day++) {
    const d = new Date(startDate + "T00:00:00");
    d.setDate(d.getDate() + day);
    const dateStr = d.toISOString().split("T")[0];

    // 09:00 slot
    const breakfastIdx = day * 2;
    const breakfast = recipes[breakfastIdx];

    if (breakfast) {
      const { data: breakfastData, error: breakfastErr } = await supabase
        .from("recipes")
        .insert({
          title: breakfast.title,
          image_url: breakfast.image_url,
          calories: breakfast.calories,
          ingredients: breakfast.ingredients,
          process: breakfast.process,
          meal_type: "desayuno",
        })
        .select("id, title, calories")
        .single();

      if (!breakfastErr && breakfastData) {
        await supabase.from("meal_plan").upsert(
          { date: dateStr, meal_time: "09:00", recipe_id: breakfastData.id },
          { onConflict: "date,meal_time" }
        );
        insertedRecipes.push({
          id: breakfastData.id,
          title: breakfastData.title,
          calories: breakfastData.calories,
          meal_time: "09:00",
          date: dateStr,
        });
      }
    }

    // 12:00 slot
    const lunchIdx = day * 2 + 1;
    const lunch = recipes[lunchIdx];

    if (lunch) {
      const { data: lunchData, error: lunchErr } = await supabase
        .from("recipes")
        .insert({
          title: lunch.title,
          image_url: lunch.image_url,
          calories: lunch.calories,
          ingredients: lunch.ingredients,
          process: lunch.process,
          meal_type: "almuerzo",
        })
        .select("id, title, calories")
        .single();

      if (!lunchErr && lunchData) {
        await supabase.from("meal_plan").upsert(
          { date: dateStr, meal_time: "12:00", recipe_id: lunchData.id },
          { onConflict: "date,meal_time" }
        );
        insertedRecipes.push({
          id: lunchData.id,
          title: lunchData.title,
          calories: lunchData.calories,
          meal_time: "12:00",
          date: dateStr,
        });
      }
    }
  }

  return NextResponse.json({
    generated: insertedRecipes.length,
    total_slots: totalSlots,
    recipes: insertedRecipes,
    model: LLM_MODEL,
  });
}
