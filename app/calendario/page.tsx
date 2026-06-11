"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Recipe {
  id: string;
  title: string;
  calories: number;
}

interface MealSlot {
  date: string;
  meal_time: string;
  recipe: Recipe | null;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
}

export default function CalendarioPage() {
  const [currentDate, setCurrentDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [mealPlan, setMealPlan] = useState<MealSlot[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [showPicker, setShowPicker] = useState<string | null>(null); // "date-meal_time"
  const [loading, setLoading] = useState(true);

  // Load recipes for picker
  useEffect(() => {
    fetch("/api/recipes")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRecipes(data);
      });
  }, []);

  // Load meal plan for current date
  useEffect(() => {
    setLoading(true);
    fetch(`/api/meal-plan?date=${currentDate}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setMealPlan(data);
        else setMealPlan([]);
      })
      .catch(() => setMealPlan([]))
      .finally(() => setLoading(false));
  }, [currentDate]);

  const getSlot = (mealTime: string) =>
    mealPlan.find((s) => s.meal_time === mealTime);

  const changeDay = (delta: number) => {
    const d = new Date(currentDate + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setCurrentDate(d.toISOString().split("T")[0]);
  };

  const goToToday = () => {
    setCurrentDate(new Date().toISOString().split("T")[0]);
  };

  const isToday = () => {
    const today = new Date().toISOString().split("T")[0];
    return currentDate === today;
  };

  const handleAssignRecipe = async (mealTime: string, recipe: Recipe) => {
    const res = await fetch("/api/meal-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: currentDate, meal_time: mealTime, recipe_id: recipe.id }),
    });
    if (res.ok) {
      const data = await res.json();
      setMealPlan((prev) => {
        const filtered = prev.filter((s) => s.meal_time !== mealTime);
        return [...filtered, { date: currentDate, meal_time: mealTime, recipe }];
      });
      setShowPicker(null);
    }
  };

  const kcal09 = getSlot("09:00")?.recipe?.calories ?? 0;
  const kcal12 = getSlot("12:00")?.recipe?.calories ?? 0;
  const totalKcal = kcal09 + kcal12;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-white py-4 px-6 shadow-md">
        <div className="max-w-2xl mx-auto">
          <nav className="text-sm text-gray-300 mb-1">
            <a href="/" className="hover:text-white transition-colors">Inicio</a>
            <span className="mx-2">/</span>
            <span className="text-white">Calendario</span>
          </nav>
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">Plan de Comidas</h1>
            <div className="ml-auto text-right">
              <p className="font-mono text-lg font-bold text-white">{totalKcal} kcal</p>
              <p className="text-xs text-gray-300">total del día</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        {/* Day navigation */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => changeDay(-1)}
            className="p-2 rounded-btn bg-surface border border-border hover:border-secondary transition-colors"
            aria-label="Día anterior"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>

          <div className="flex-1 text-center">
            <p className={`text-lg font-semibold ${isToday() ? "text-secondary" : "text-text-primary"}`}>
              {formatDate(currentDate)}
            </p>
            {isToday() && <p className="text-xs text-secondary font-medium">Hoy</p>}
          </div>

          <button
            onClick={() => changeDay(1)}
            className="p-2 rounded-btn bg-surface border border-border hover:border-secondary transition-colors"
            aria-label="Día siguiente"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        {/* Today button */}
        {!isToday() && (
          <button
            onClick={goToToday}
            className="w-full mb-5 py-2.5 rounded-btn bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Ir a hoy
          </button>
        )}

        {/* Meal slots */}
        <div className="space-y-4">
          {[
            { time: "09:00", label: "09:00 — Desayuno" },
            { time: "12:00", label: "12:00 — Comida" },
          ].map(({ time, label }) => {
            const slot = getSlot(time);
            const pickerKey = `${currentDate}-${time}`;

            return (
              <div key={time} className="bg-surface rounded-card border border-border overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-gray-50">
                  <p className="text-sm font-semibold text-text-primary">{label}</p>
                  <p className="text-xs text-text-muted">
                    {slot ? `${slot.recipe?.calories} kcal` : "Sin asignar"}
                  </p>
                </div>

                {slot && slot.recipe ? (
                  <Link
                    href={`/recetas`}
                    className="block px-4 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <p className="font-semibold text-text-primary text-sm">{slot.recipe.title}</p>
                        <p className="font-mono text-sm text-secondary mt-0.5">
                          {slot.recipe.calories} kcal
                        </p>
                      </div>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-text-muted mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </Link>
                ) : (
                  <div className="px-4 py-4">
                    <button
                      onClick={() => setShowPicker(pickerKey)}
                      className="w-full py-3 rounded-btn border-2 border-dashed border-border text-text-muted hover:border-secondary hover:text-secondary transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      Asignar receta
                    </button>
                  </div>
                )}

                {/* Recipe picker modal */}
                {showPicker === pickerKey && (
                  <div className="border-t border-border bg-gray-50 p-3">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                      Selecciona una receta
                    </p>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {recipes.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => handleAssignRecipe(time, r)}
                          className="w-full text-left px-3 py-2 rounded-btn text-sm hover:bg-gray-100 transition-colors"
                        >
                          <span className="font-medium">{r.title}</span>
                          <span className="ml-2 font-mono text-xs text-secondary">({r.calories} kcal)</span>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setShowPicker(null)}
                      className="mt-2 text-xs text-text-muted hover:text-red-500 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Quick summary */}
        <div className="mt-6 p-4 bg-surface rounded-card border border-border">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="font-mono text-xl font-bold text-secondary">{kcal09}</p>
              <p className="text-xs text-text-muted">kcal desayuno</p>
            </div>
            <div>
              <p className="font-mono text-xl font-bold text-secondary">{kcal12}</p>
              <p className="text-xs text-text-muted">kcal comida</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
