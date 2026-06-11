import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `Eres un chef nutricional especializado en cocina oriental Saludable, bajas en calorías (max 500 kcal por comida), máximo 15 ingredientes, proceso claro de 3-5 pasos, todo en sistema métrico. Generas en formato JSON exacto.`;

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

  // Count how many recipes we need to generate
  const slotsPerDay = 2; // 09:00 and 12:00
  const totalSlots = days * slotsPerDay;

  // Check existing recipes count to see what we already have
  const { count: existingCount } = await supabase
    .from("recipes")
    .select("*", { count: "exact", head: true });

  // Build prompt for bulk recipe generation
  const prompt = `Genera ${totalSlots} recetas orientales saludables para un plan de comidas.

DATOS DEL USUARIO:
- Hombre, 38 años, 1.66m, 82kg → meta 72kg
- Objetivo: déficit calórico con cocina oriental
- Ingredientes disponibles: los que tengas en tu inventario (asume que tienes los básicos)
- Solo sistema métrico (g, ml, kg)

FORMATO: Devuelve SOLO un array JSON con ${totalSlots} recetas, cada una con esta estructura exacta:
{
  "title": "nombre en español, descriptor oriental",
  "image_url": "URL de imagen de Unsplash del plato (solo el URL completo, ejemplo: https://images.unsplash.com/photo-xxxxxxxx?w=400)",
  "calories": número entero de kcal,
  "ingredients": "ingrediente1 cantidadg, ingrediente2 cantidadg, ...",
  "process": "Paso 1.... Paso 2. ... Paso 3. ...",
  "meal_type": "desayuno" o "almuerzo"
}

REGLAS:
- Máximo 500 kcal por receta
- Máximo 15 ingredientes
- Calories debe ser coherente con los ingredientes (usa el poder calorífico real aproximado)
- image_url: usa fotos reales de Unsplash que existan (ejemplo: https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400)
- ingredients: lista detallada con cantidades en GRAMOS (g) o ML (ml), separadas por comas
- process: 3 a 5 pasos numerados, cada paso corto
- meal_type: "desayuno" para slots de 09:00, "almuerzo" para slots de 12:00
- Variedad: NO repitas recetas, cada una debe ser diferente
- Cuisine: japonesa, china, coreana, tailandesa, vietnamita, india oriental
- Baila la generación entre los primeros ${existingCount ?? 0} IDs ya existentes para no repetir títulos

EJEMPLO de una receta:
{
  "title": "Tofu salteado con brócoli y sésamo",
  "image_url": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
  "calories": 320,
  "ingredients": "tofu firme 200g, brócoli 150g, ajo 10g, jengibre fresco 10g, salsa soja 15ml, aceite sésamo 5ml, semillas sésamo 5g, maicena 10g",
  "process": "1. Cortar el tofu en cubos y marinar con salsa soja y jengibre. 2. Saltear el brócoli en aceite sésamo 3 minutos. 3. Añadir el tofu y cocinar 5 minutos. 4. Disolver maicena en agua yespesar la salsa. 5. Terminar con semillas de sésamo.",
  "meal_type": "almuerzo"
}

Genera ahora las ${totalSlots} recetas, todas diferentes, variedad máxima:`;

  const llmRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
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
  });
}
