import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date) {
    return NextResponse.json({ error: "date param required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("meal_plan")
    .select("date, meal_time, recipe_id, recipes(id, title, calories)")
    .eq("date", date)
    .order("meal_time");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Normalize to flat shape - cast recipes from unknown array to object
  const result = (data || []).map((row: { date: string; meal_time: string; recipe_id: string | null; recipes: { id: string; title: string; calories: number } | unknown[] | null }) => {
    const recipes = row.recipes as { id: string; title: string; calories: number } | null;
    return {
      date: row.date,
      meal_time: row.meal_time,
      recipe: recipes && !Array.isArray(recipes)
        ? { id: recipes.id, title: recipes.title, calories: recipes.calories }
        : null,
    };
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const { date, meal_time, recipe_id } = await request.json();

  if (!date || !meal_time || !recipe_id) {
    return NextResponse.json({ error: "date, meal_time and recipe_id required" }, { status: 400 });
  }

  // Upsert
  const { data, error } = await supabase
    .from("meal_plan")
    .upsert(
      { date, meal_time, recipe_id },
      { onConflict: "date,meal_time" }
    )
    .select("date, meal_time, recipe_id, recipes(id, title, calories)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const recipes = data.recipes as unknown as { id: string; title: string; calories: number } | null;
  return NextResponse.json({
    date: data.date,
    meal_time: data.meal_time,
    recipe: recipes && !Array.isArray(recipes)
      ? { id: recipes.id, title: recipes.title, calories: recipes.calories }
      : null,
  });
}