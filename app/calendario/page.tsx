"use client";

import { useState, useEffect, useCallback } from "react";
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

type ViewMode = "day" | "week" | "month";

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

function formatMonthYear(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarioPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [currentDate, setCurrentDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    return getMondayOfWeek(today);
  });
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [mealPlan, setMealPlan] = useState<MealSlot[]>([]);
  const [weekPlan, setWeekPlan] = useState<Map<string, MealSlot[]>>(new Map());
  const [monthPlan, setMonthPlan] = useState<Map<string, MealSlot[]>>(new Map());
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [showPicker, setShowPicker] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<string>("");

  // Load recipes for picker
  useEffect(() => {
    fetch("/api/recipes")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRecipes(data);
      });
  }, []);

  // Load meal plan data
  const loadDayData = useCallback((date: string) => {
    setLoading(true);
    fetch(`/api/meal-plan?date=${date}`)
      .then((r) => r.json())
      .then((data) => {
        setMealPlan(Array.isArray(data) ? data : []);
      })
      .catch(() => setMealPlan([]))
      .finally(() => setLoading(false));
  }, []);

  const loadWeekData = useCallback((weekStart: Date) => {
    setLoading(true);
    const promises: Promise<void>[] = [];
    const weekPlanMap = new Map<string, MealSlot[]>();

    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];

      promises.push(
        fetch(`/api/meal-plan?date=${dateStr}`)
          .then((r) => r.json())
          .then((data) => {
            weekPlanMap.set(dateStr, Array.isArray(data) ? data : []);
          })
          .catch(() => {
            weekPlanMap.set(dateStr, []);
          })
      );
    }

    Promise.all(promises).then(() => {
      setWeekPlan(weekPlanMap);
      setLoading(false);
    });
  }, []);

  const loadMonthData = useCallback((year: number, month: number) => {
    setLoading(true);
    const daysInMonth = getDaysInMonth(year, month);
    const promises: Promise<void>[] = [];
    const monthPlanMap = new Map<string, MealSlot[]>();

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      promises.push(
        fetch(`/api/meal-plan?date=${dateStr}`)
          .then((r) => r.json())
          .then((data) => {
            monthPlanMap.set(dateStr, Array.isArray(data) ? data : []);
          })
          .catch(() => {
            monthPlanMap.set(dateStr, []);
          })
      );
    }

    Promise.all(promises).then(() => {
      setMonthPlan(monthPlanMap);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (viewMode === "day") loadDayData(currentDate);
    else if (viewMode === "week") loadWeekData(currentWeekStart);
    else loadMonthData(currentMonth.year, currentMonth.month);
  }, [viewMode, currentDate, currentWeekStart, currentMonth, loadDayData, loadWeekData, loadMonthData]);

  const getSlot = (date: string, mealTime: string) => {
    const plan = viewMode === "day" ? mealPlan : viewMode === "week" ? weekPlan.get(date) ?? [] : monthPlan.get(date) ?? [];
    return plan.find((s) => s.meal_time === mealTime);
  };

  const changeDay = (delta: number) => {
    const d = new Date(currentDate + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setCurrentDate(d.toISOString().split("T")[0]);
  };

  const goToToday = () => {
    const today = new Date().toISOString().split("T")[0];
    setCurrentDate(today);
    setViewMode("day");
  };

  const isToday = (dateStr: string) => {
    return dateStr === new Date().toISOString().split("T")[0];
  };

  const changeWeek = (delta: number) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + delta * 7);
    setCurrentWeekStart(d);
  };

  const changeMonth = (delta: number) => {
    setCurrentMonth((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      days.push(d.toISOString().split("T")[0]);
    }
    return days;
  };

  const getMonthDays = () => {
    const year = currentMonth.year;
    const month = currentMonth.month;
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month); // 0=Mon...6=Sun
    const offset = firstDay === 0 ? 6 : firstDay - 1; // Monday-start

    const days: (string | null)[] = [];
    for (let i = 0; i < offset; i++) days.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    }
    return days;
  };

  const handleAssignRecipe = async (date: string, mealTime: string, recipe: Recipe) => {
    const res = await fetch("/api/meal-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, meal_time: mealTime, recipe_id: recipe.id }),
    });
    if (res.ok) {
      // Refresh current view
      if (viewMode === "day") loadDayData(currentDate);
      else if (viewMode === "week") loadWeekData(currentWeekStart);
      else loadMonthData(currentMonth.year, currentMonth.month);
      setShowPicker(null);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenResult("");
    try {
      let startDate: string;
      let days: number;

      if (viewMode === "day") {
        startDate = currentDate;
        days = 1;
      } else if (viewMode === "week") {
        startDate = currentWeekStart.toISOString().split("T")[0];
        days = 7;
      } else {
        // month: start from 1st of month
        startDate = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, "0")}-01`;
        days = getDaysInMonth(currentMonth.year, currentMonth.month);
      }

      const res = await fetch("/api/generate-meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, days }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error desconocido");

      setGenResult(`✓ ${data.generated} recetas generadas para ${days === 1 ? "hoy" : days === 7 ? "esta semana" : "este mes"}`);
      setTimeout(() => setGenResult(""), 4000);

      // Refresh view
      if (viewMode === "day") loadDayData(currentDate);
      else if (viewMode === "week") loadWeekData(currentWeekStart);
      else loadMonthData(currentMonth.year, currentMonth.month);
    } catch (e: unknown) {
      setGenResult(`✗ Error: ${e instanceof Error ? e.message : String(e)}`);
      setTimeout(() => setGenResult(""), 5000);
    } finally {
      setGenerating(false);
    }
  };

  const kcal09 = getSlot(currentDate, "09:00")?.recipe?.calories ?? 0;
  const kcal12 = getSlot(currentDate, "12:00")?.recipe?.calories ?? 0;
  const totalKcal = kcal09 + kcal12;

  const weekDays = getWeekDays();
  const monthDays = getMonthDays();
  const weekDayLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  const RecipeButton = ({ date, mealTime, slot }: { date: string; mealTime: string; slot: MealSlot | undefined }) => {
    const pickerKey = `${date}-${mealTime}`;
    if (slot && slot.recipe) {
      return (
        <>
          <Link
            href={`/recetas`}
            className="flex items-start gap-2 px-3 py-2 hover:bg-gray-50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-text-primary text-xs truncate">{slot.recipe.title}</p>
              <p className="font-mono text-xs text-secondary mt-0.5">{slot.recipe.calories} kcal</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-text-muted mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
          {showPicker === pickerKey && (
            <div className="border-t border-border bg-gray-50 p-2">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Cambiar</p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {recipes.map((r) => (
                  <button key={r.id} onClick={() => handleAssignRecipe(date, mealTime, r)} className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-gray-100 transition-colors">
                    <span className="font-medium">{r.title}</span>
                    <span className="ml-1 font-mono text-secondary">({r.calories})</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowPicker(null)} className="mt-1 text-xs text-text-muted hover:text-red-500">✕</button>
            </div>
          )}
        </>
      );
    }
    return (
      <>
        <button
          onClick={() => setShowPicker(pickerKey)}
          className="w-full py-2 rounded-btn border-2 border-dashed border-border text-text-muted hover:border-secondary hover:text-secondary transition-colors text-xs flex items-center justify-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Asignar
        </button>
        {showPicker === pickerKey && (
          <div className="border-t border-border bg-gray-50 p-2">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Selecciona</p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {recipes.map((r) => (
                <button key={r.id} onClick={() => handleAssignRecipe(date, mealTime, r)} className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-gray-100 transition-colors">
                  <span className="font-medium">{r.title}</span>
                  <span className="ml-1 font-mono text-secondary">({r.calories})</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowPicker(null)} className="mt-1 text-xs text-text-muted hover:text-red-500">✕</button>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-white py-4 px-6 shadow-md">
        <div className="max-w-2xl mx-auto">
          <nav className="text-sm text-gray-300 mb-1">
            <a href="/" className="hover:text-white transition-colors">Inicio</a>
            <span className="mx-2">/</span>
            <span className="text-white">Calendario</span>
            <span className="mx-2">/</span>
            <a href="/config" className="hover:text-white transition-colors">Config</a>
          </nav>
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-bold">Plan de Comidas</h1>
            <a href="/config" className="text-gray-300 hover:text-white transition-colors text-sm" title="Configuración">⚙️</a>
            {viewMode === "day" && (
              <div className="ml-auto text-right">
                <p className="font-mono text-lg font-bold text-white">{totalKcal} kcal</p>
                <p className="text-xs text-gray-300">total del día</p>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        {/* View mode tabs */}
        <div className="flex gap-1 mb-4 bg-surface rounded-btn p-1 border border-border">
          {(["day", "week", "month"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex-1 py-2 rounded-btn text-sm font-medium transition-all ${
                viewMode === mode
                  ? "bg-secondary text-white shadow-sm"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {mode === "day" ? "Día" : mode === "week" ? "Semana" : "Mes"}
            </button>
          ))}
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full mb-4 py-3 rounded-btn bg-primary text-white hover:bg-primary/90 transition-all text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generando recetas con IA...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Generar recetas ({viewMode === "day" ? "hoy" : viewMode === "week" ? "esta semana" : "este mes"})
            </>
          )}
        </button>

        {genResult && (
          <div className={`mb-4 p-3 rounded-btn text-sm font-medium ${genResult.startsWith("✓") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {genResult}
          </div>
        )}

        {/* DAY VIEW */}
        {viewMode === "day" && (
          <>
            <div className="flex items-center gap-4 mb-4">
              <button onClick={() => changeDay(-1)} className="p-2 rounded-btn bg-surface border border-border hover:border-secondary transition-colors" aria-label="Día anterior">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <div className="flex-1 text-center">
                <p className={`text-lg font-semibold ${isToday(currentDate) ? "text-secondary" : "text-text-primary"}`}>
                  {formatDate(currentDate)}
                </p>
                {isToday(currentDate) && <p className="text-xs text-secondary font-medium">Hoy</p>}
              </div>
              <button onClick={() => changeDay(1)} className="p-2 rounded-btn bg-surface border border-border hover:border-secondary transition-colors" aria-label="Día siguiente">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>

            {!isToday(currentDate) && (
              <button onClick={goToToday} className="w-full mb-4 py-2.5 rounded-btn bg-surface border border-border text-sm font-medium hover:border-secondary transition-colors">
                Ir a hoy
              </button>
            )}

            <div className="space-y-3">
              {[
                { time: "09:00", label: "09:00 — Desayuno" },
                { time: "12:00", label: "12:00 — Comida" },
              ].map(({ time, label }) => {
                const slot = getSlot(currentDate, time);
                return (
                  <div key={time} className="bg-surface rounded-card border border-border overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-border bg-gray-50">
                      <p className="text-sm font-semibold text-text-primary">{label}</p>
                      <p className="text-xs text-text-muted">{slot ? `${slot.recipe?.calories} kcal` : "Sin asignar"}</p>
                    </div>
                    <div className="py-2">
                      <RecipeButton date={currentDate} mealTime={time} slot={slot} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 p-4 bg-surface rounded-card border border-border">
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
          </>
        )}

        {/* WEEK VIEW */}
        {viewMode === "week" && (
          <>
            <div className="flex items-center gap-4 mb-4">
              <button onClick={() => changeWeek(-1)} className="p-2 rounded-btn bg-surface border border-border hover:border-secondary transition-colors" aria-label="Semana anterior">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <div className="flex-1 text-center">
                <p className="text-lg font-semibold text-text-primary">
                  {formatDate(weekDays[0])} — {formatDate(weekDays[6])}
                </p>
              </div>
              <button onClick={() => changeWeek(1)} className="p-2 rounded-btn bg-surface border border-border hover:border-secondary transition-colors" aria-label="Semana siguiente">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              {weekDays.map((date) => {
                const slot09 = getSlot(date, "09:00");
                const slot12 = getSlot(date, "12:00");
                return (
                  <div key={date} className={`bg-surface rounded-card border overflow-hidden ${isToday(date) ? "border-secondary" : "border-border"}`}>
                    <div className={`px-3 py-2 border-b border-border ${isToday(date) ? "bg-secondary/5" : "bg-gray-50"}`}>
                      <p className={`text-sm font-semibold ${isToday(date) ? "text-secondary" : "text-text-primary"}`}>
                        {formatDate(date)}
                      </p>
                    </div>
                    <div className="divide-y divide-border">
                      <div className="px-3 py-1.5">
                        <p className="text-xs text-text-muted mb-1">09:00</p>
                        <RecipeButton date={date} mealTime="09:00" slot={slot09} />
                      </div>
                      <div className="px-3 py-1.5">
                        <p className="text-xs text-text-muted mb-1">12:00</p>
                        <RecipeButton date={date} mealTime="12:00" slot={slot12} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* MONTH VIEW */}
        {viewMode === "month" && (
          <>
            <div className="flex items-center gap-4 mb-4">
              <button onClick={() => changeMonth(-1)} className="p-2 rounded-btn bg-surface border border-border hover:border-secondary transition-colors" aria-label="Mes anterior">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <div className="flex-1 text-center">
                <p className="text-lg font-semibold text-text-primary">{formatMonthYear(`${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, "0")}-01`)}</p>
              </div>
              <button onClick={() => changeMonth(1)} className="p-2 rounded-btn bg-surface border border-border hover:border-secondary transition-colors" aria-label="Mes siguiente">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {weekDayLabels.map((label) => (
                <div key={label} className="text-center text-xs font-semibold text-text-muted py-1">{label}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-px bg-border rounded-card overflow-hidden">
              {monthDays.map((date, idx) => {
                if (!date) {
                  return <div key={`empty-${idx}`} className="bg-surface min-h-24" />;
                }
                const slot09 = getSlot(date, "09:00");
                const slot12 = getSlot(date, "12:00");
                const hasMeals = !!(slot09?.recipe || slot12?.recipe);
                return (
                  <div key={date} className={`bg-surface min-h-24 p-1.5 ${isToday(date) ? "ring-2 ring-inset ring-secondary" : ""}`}>
                    <p className={`text-xs font-bold mb-1 ${isToday(date) ? "text-secondary" : "text-text-primary"}`}>
                      {new Date(date + "T00:00:00").getDate()}
                    </p>
                    {hasMeals ? (
                      <div className="space-y-1">
                        {slot09?.recipe && (
                          <div className="bg-secondary/10 rounded px-1 py-0.5">
                            <p className="text-[10px] text-secondary font-medium truncate">09: {slot09.recipe.calories}</p>
                          </div>
                        )}
                        {slot12?.recipe && (
                          <div className="bg-secondary/10 rounded px-1 py-0.5">
                            <p className="text-[10px] text-secondary font-medium truncate">12: {slot12.recipe.calories}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-6 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-text-muted text-center mt-3">Pulsa en un día para ver sus comidas en vista día</p>
          </>
        )}
      </main>
    </div>
  );
}
