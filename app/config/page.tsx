"use client";

import { useState, useEffect, useCallback } from "react";

interface Config {
  recipe_system_prompt: string;
  recipe_user_prompt: string;
  llm_model: string;
}

const DEFAULT_CONFIG: Config = {
  recipe_system_prompt:
    "Eres un chef nutricional especializado en cocina oriental Saludable, bajas en calorías (max 500 kcal por comida), máximo 15 ingredientes, proceso claro de 3-5 pasos, todo en sistema métrico. Generas en formato JSON exacto.",
  recipe_user_prompt:
    "Genera {totalSlots} recetas orientales saludables para un plan de comidas.\n\nDATOS DEL USUARIO:\n- Hombre, 38 años, 1.66m, 82kg → meta 72kg\n- Objetivo: déficit calórico con cocina oriental\n- Ingredientes disponibles: los que tengas en tu inventario\n- Solo sistema métrico (g, ml, kg)\n\nFORMATO: Devuelve SOLO un array JSON con {totalSlots} recetas:\n{\n  \"title\": \"nombre en español\",\n  \"image_url\": \"https://images.unsplash.com/...\",\n  \"calories\": número,\n  \"ingredients\": \"ingrediente1 cantidadg, ...\",\n  \"process\": \"Paso 1... Paso 2...\",\n  \"meal_type\": \"desayuno\" | \"almuerzo\"\n}\n\nREGLAS:\n- Máximo 500 kcal\n- Máximo 15 ingredientes\n- Variedad entre recetas\n- Cuisine: japonesa, china, coreana, tailandesa, vietnamita",
  llm_model: "deepseek/deepseek-v4-pro",
};

const MODEL_OPTIONS = [
  { value: "deepseek/deepseek-v4-pro", label: "DeepSeek V4 Pro (recomendado)" },
  { value: "deepseek/deepseek-v4-flash", label: "DeepSeek V4 Flash (rápido)" },
  { value: "openai/gpt-4o", label: "GPT-4o (potente)" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini (balanceado)" },
  { value: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4" },
];

export default function ConfigPage() {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [original, setOriginal] = useState<Config>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"prompt" | "model">("prompt");

  // Load config on mount
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        const loaded: Config = {
          recipe_system_prompt:
            data.recipe_system_prompt || DEFAULT_CONFIG.recipe_system_prompt,
          recipe_user_prompt:
            data.recipe_user_prompt || DEFAULT_CONFIG.recipe_user_prompt,
          llm_model: data.llm_model || DEFAULT_CONFIG.llm_model,
        };
        setConfig(loaded);
        setOriginal(loaded);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isDirty = JSON.stringify(config) !== JSON.stringify(original);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      // Save each key separately
      const keys = ["recipe_system_prompt", "recipe_user_prompt", "llm_model"] as const;
      for (const key of keys) {
        const res = await fetch("/api/config", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value: config[key] }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || `Error guardando ${key}`);
        }
      }
      setOriginal(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }, [config]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-text-muted">Cargando configuración…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-white py-4 px-6 shadow-md">
        <div className="max-w-3xl mx-auto">
          <nav className="text-sm text-gray-300 mb-1">
            <a href="/" className="hover:text-white transition-colors">Inicio</a>
            <span className="mx-2">/</span>
            <span className="text-white">Configuración</span>
          </nav>
          <h1 className="text-xl font-bold">Configuración — Prompt de Recetas</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
        {/* Tab switcher */}
        <div className="flex gap-1 bg-surface border border-border rounded-btn p-1">
          {(["prompt", "model"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-4 rounded-btn text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-primary text-white"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {tab === "prompt" ? "✏️ Prompt del LLM" : "🤖 Modelo"}
            </button>
          ))}
        </div>

        {activeTab === "prompt" ? (
          <div className="space-y-4">
            {/* System prompt */}
            <div className="bg-surface border border-border rounded-card p-5">
              <label className="block text-sm font-semibold text-text-muted uppercase tracking-wide mb-2">
                System Prompt
                <span className="ml-2 text-xs font-normal text-text-muted normal-case tracking-normal">
                  (instrucciones del chef)
                </span>
              </label>
              <p className="text-xs text-text-muted mb-3">
                Este texto se envía como <code className="bg-gray-100 px-1 rounded">role: system</code> en cada generación. Define el rol y las reglas globales.
              </p>
              <textarea
                className="w-full h-40 p-3 rounded-btn border border-border bg-background font-mono text-sm text-text-primary resize-y focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all"
                value={config.recipe_system_prompt}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, recipe_system_prompt: e.target.value }))
                }
                spellCheck={false}
              />
            </div>

            {/* User prompt */}
            <div className="bg-surface border border-border rounded-card p-5">
              <label className="block text-sm font-semibold text-text-muted uppercase tracking-wide mb-2">
                User Prompt
                <span className="ml-2 text-xs font-normal text-text-muted normal-case tracking-normal">
                  (solicitud de generación)
                </span>
              </label>
              <p className="text-xs text-text-muted mb-3">
                Plantilla enviada como <code className="bg-gray-100 px-1 rounded">role: user</code>. Usa{" "}
                <code className="bg-gray-100 px-1 rounded">{"{totalSlots}"}</code> para número de recetas y{" "}
                <code className="bg-gray-100 px-1 rounded">{"{existingCount}"}</code> para recetas ya existentes.
              </p>
              <textarea
                className="w-full h-64 p-3 rounded-btn border border-border bg-background font-mono text-sm text-text-primary resize-y focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all"
                value={config.recipe_user_prompt}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, recipe_user_prompt: e.target.value }))
                }
                spellCheck={false}
              />
            </div>

            {/* Placeholder hints */}
            <div className="bg-blue-50 border border-blue-200 rounded-card p-4">
              <h3 className="text-sm font-semibold text-blue-800 mb-2">ℹ️ Placeholders disponibles</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>
                  <code className="bg-blue-100 px-1 rounded">{"{totalSlots}"}</code> — Número total de recetas a generar (días × 2 slots)
                </li>
                <li>
                  <code className="bg-blue-100 px-1 rounded">{"{existingCount}"}</code> — Cantidad de recetas ya existentes en la DB
                </li>
                <li>
                  <code className="bg-blue-100 px-1 rounded">{"{startDate}"}</code> — Fecha de inicio del plan
                </li>
                <li>
                  <code className="bg-blue-100 px-1 rounded">{"{days}"}</code> — Número de días del plan
                </li>
              </ul>
            </div>
          </div>
        ) : (
          /* Model selector */
          <div className="bg-surface border border-border rounded-card p-5">
            <label className="block text-sm font-semibold text-text-muted uppercase tracking-wide mb-2">
              Modelo LLM
            </label>
            <p className="text-xs text-text-muted mb-4">
              Modelo usado para generar recetas vía OpenRouter.
            </p>
            <div className="space-y-2">
              {MODEL_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 p-3 rounded-btn border cursor-pointer transition-all ${
                    config.llm_model === opt.value
                      ? "border-secondary bg-secondary/5"
                      : "border-border hover:border-secondary/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="model"
                    value={opt.value}
                    checked={config.llm_model === opt.value}
                    onChange={() =>
                      setConfig((c) => ({ ...c, llm_model: opt.value }))
                    }
                    className="accent-secondary"
                  />
                  <span className="text-sm text-text-primary">{opt.label}</span>
                  {opt.value === "deepseek/deepseek-v4-pro" && (
                    <span className="ml-auto text-xs bg-secondary text-white px-2 py-0.5 rounded-full">
                      ★ nuevo
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Save bar */}
        <div className="sticky bottom-4 bg-surface border border-border rounded-card p-4 shadow-lg flex items-center gap-4">
          <div className="flex-1">
            {saved && (
              <span className="text-sm text-green-600 font-medium">✓ Guardado correctamente</span>
            )}
            {error && (
              <span className="text-sm text-red-600 font-medium">✗ {error}</span>
            )}
            {isDirty && !saved && !error && (
              <span className="text-sm text-text-muted">Cambios sin guardar</span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className={`px-5 py-2 rounded-btn text-sm font-semibold transition-all ${
              saving
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : isDirty
                ? "bg-secondary text-white hover:bg-secondary/90 shadow-sm"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {saving ? "Guardando…" : "💾 Guardar cambios"}
          </button>
        </div>

        {/* Info footer */}
        <p className="text-center text-xs text-text-muted pb-8">
          Los cambios se aplican en la siguiente generación de menú desde{" "}
          <a href="/calendario" className="text-secondary hover:underline">Calendario</a>.
        </p>
      </div>
    </div>
  );
}
