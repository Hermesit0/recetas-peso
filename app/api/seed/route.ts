import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

interface GeneratedRecipe {
  title: string;
  calories: number;
  ingredients: { item: string; amount: string }[];
  process: string[];
  image_query: string;
}

async function generateRecipe(prompt: string): Promise<GeneratedRecipe> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Eres un chef nutricionista especializado en cocina oriental baja en calorías.
Responde SOLO con JSON válido, sin texto antes ni después.
Formato:
{
  "title": "nombre de la receta en español",
  "calories": número entero de kcal,
  "ingredients": [{"item": "ingrediente en español", "amount": "cantidad en sistema métrico (g, ml, kg)"}],
  "process": ["paso 1", "paso 2", ...],
  "image_query": "breve query en inglés para Unsplash que represente la receta visualmente"
}
Las recetas deben ser de estilo oriental (japonés, chino, coreano, tailandés, vietnamita...).
Cada receta entre 200-500 kcal. Ingredientes en sistema métrico puro (g, ml, kg, unidades).
Proceso de 4-8 pasos.
Responde SOLO con el JSON.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 800,
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`);
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content from LLM");

  return JSON.parse(content);
}

const recipePrompts = [
  "Ramen bajo en calorías con caldo dashi light, fideos soba, tofu, alga nori y verduras. Máximo 350 kcal.",
  "Ensalada de mango y pollo al estilo tailandés con salsa de fish sauce light, menta y lima. Máximo 320 kcal.",
  "Pollo yakitori bajo en grasa hecho en wok con Anti-Quiyaki (salsa soja diluida), cebolleta y sésamo. Máximo 300 kcal.",
  "Sopa miso tradicional.light con tofu, wakame y cebolleta, sin daging extra. Máximo 150 kcal.",
  "Bibimbap coreano light con arroz integral, verduras salteadas, huevo pochado y gochujang diluido. Máximo 400 kcal.",
  "Gyoza (dumplings) al vapor o salteados con relleno de cerdo magro y col, salsa para dipping light. Máximo 320 kcal.",
  "Pad thai bajo en calorías con fideos de arroz, gambas, tofu seco, cacahuetes y lima. Máximo 380 kcal.",
  "Curry rojo tailandés light con leche de coco reducida, pollo desmenuzado, bambú y Thai basil. Máximo 340 kcal.",
  "Onigiri bajo en sodio con arroz, alga nori y relleno de atún light mezclado con mayonesa. Máximo 220 kcal.",
  "Soba frío (zaru soba) con salsa de ichimi dashi, rábano daikon rallado y sésamo. Máximo 280 kcal.",
  "Bao buns (buncitos al vapor) con masa integral y relleno de cerdo magro y chive. Máximo 300 kcal.",
  "Kimchi jjigae coreano light con kimchi fermentation reducida, tofu y arroz integral. Máximo 290 kcal.",
  "Dim sum al vapor: har gow y siu mai bajos en grasa, servidos con salsa de ostra diluida. Máximo 340 kcal.",
  "Udon en caldo dashi light con verduras tempura (solo 2 piezas) y wakame. Máximo 350 kcal.",
  "Poke bowl bajo en calorías con tofu marinado en salsa de soja, arroz integral, edamame y aguacate. Máximo 380 kcal.",
  "Sopa agripicante china con pollo desmenuzado, bamboo shoots y黑色的 vinegar. Máximo 180 kcal.",
  "Fideos de arroz con stir-fry de brócoli y pollo al jengibre, salsa hoisin diluida. Máximo 360 kcal.",
  "Noodles udon fríos con cobertura de pepino, zanahoria rallada, germen de soja y salsa de sésamo light. Máximo 260 kcal.",
  "Cerdo agridulce light con pineapple fresco, pimiento y cebolla, sin freír, al horno. Máximo 320 kcal.",
  "Shakshuka oriental con huevos, tomate, pimiento, comino y paprika, servido con pan integral. Máximo 280 kcal.",
];

export async function POST() {
  if (!OPENROUTER_API_KEY) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY not set" }, { status: 500 });
  }

  // Check if recipes already exist
  const { count } = await supabase.from("recipes").select("*", { count: "exact" });
  if (count && count > 0) {
    return NextResponse.json({ message: `Already seeded: ${count} recipes exist` });
  }

  const recipes: GeneratedRecipe[] = [];
  const errors: string[] = [];

  for (let i = 0; i < recipePrompts.length; i++) {
    try {
      const recipe = await generateRecipe(recipePrompts[i]);
      recipes.push(recipe);
    } catch (e) {
      errors.push(`Recipe ${i + 1}: ${e}`);
    }
    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 500));
  }

  // Insert into Supabase
  const toInsert = recipes.map((r) => ({
    title: r.title,
    calories: r.calories,
    ingredients: r.ingredients,
    process: r.process,
    image_query: r.image_query,
  }));

  const { error: insertError } = await supabase.from("recipes").insert(toInsert);

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    seeded: recipes.length,
    errors,
    recipes: recipes.map((r) => ({ title: r.title, calories: r.calories })),
  });
}
