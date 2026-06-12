"use client";

import { useState, useEffect, useCallback } from "react";

interface Ingredient {
  item: string;
  amount: string;
}

interface Recipe {
  id: string;
  title: string;
  calories: number;
  ingredients: Ingredient[];
  process: string[];
  image_url: string;
}

export default function RecetasPage() {
  const [query, setQuery] = useState<string>("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);

  // Search with debounce
  useEffect(() => {
    if (!query.trim()) {
      // Load all recipes when query is empty
      fetch("/api/recipes")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setRecipes(data.map(normalizeRecipe));
        })
        .catch(() => {});
      return;
    }

    const timer = setTimeout(() => {
      fetch(`/api/recipes/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setRecipes(data.map(normalizeRecipe));
        })
        .catch(() => {});
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Load all recipes on mount
  useEffect(() => {
    fetch("/api/recipes")
      .then((r) => r.json())
      .then((data) => {
          if (Array.isArray(data)) {
          const normalized = data.map(normalizeRecipe);
          setRecipes(normalized);
          if (normalized.length > 0) setSelectedRecipe(normalized[0]);
        }
      })
      .catch(() => {});
  }, []);

  const handleSelect = async (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    // Scroll to detail on mobile
    if (window.innerWidth < 768) {
      document.getElementById("recipe-detail")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Normalize recipe data — DB stores as strings, UI expects arrays
  const normalizeRecipe = (r: Recipe | Record<string, unknown>): Recipe => {
    const ing = r.ingredients;
    const proc = r.process;
    return {
      ...r,
      ingredients: typeof ing === "string"
        ? ing.split(",").map((s: string) => ({ item: s.trim(), amount: "" }))
        : Array.isArray(ing) ? ing : [],
      process: typeof proc === "string"
        ? proc.split(".").map((s: string) => s.trim()).filter(Boolean)
        : Array.isArray(proc) ? proc : [],
    } as Recipe;
  };

  const getImageUrl = (imageUrl: string) => {
    if (imageUrl && imageUrl.startsWith("http")) return imageUrl;
    const q = encodeURIComponent(imageUrl || "asian food");
    return `https://source.unsplash.com/800x450/?${q}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-white py-4 px-6 shadow-md">
        <div className="max-w-6xl mx-auto">
          <nav className="text-sm text-gray-300 mb-1">
            <a href="/" className="hover:text-white transition-colors">Inicio</a>
            <span className="mx-2">/</span>
            <span className="text-white">Recetas</span>
            <span className="mx-2">/</span>
            <a href="/config" className="hover:text-white transition-colors">Config</a>
          </nav>
          <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Recetas Orientales</h1>
          <a href="/config" className="text-gray-300 hover:text-white transition-colors text-sm" title="Configuración">⚙️</a>
          </div>
        </div>
      </header>

      {/* Search bar */}
      <div className="bg-surface border-b border-border px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por título..."
              className="w-full pl-10 pr-4 py-2.5 rounded-btn border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all text-sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main layout: sidebar + detail */}
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row" style={{ minHeight: "calc(100vh - 120px)" }}>
        {/* Sidebar: recipe list */}
        <aside
          className="w-full md:w-72 flex-shrink-0 border-r border-border overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 120px)" }}
        >
          <div className="p-3 space-y-1">
            {recipes.length === 0 && !loading && (
              <p className="text-sm text-text-muted text-center py-8">Sin resultados</p>
            )}
            {recipes.map((recipe) => (
              <button
                key={recipe.id}
                onClick={() => handleSelect(recipe)}
                className={`w-full text-left px-3 py-3 rounded-btn transition-all text-sm ${
                  selectedRecipe?.id === recipe.id
                    ? "bg-secondary/10 border border-secondary/30 text-secondary"
                    : "hover:bg-gray-100 text-text-primary border border-transparent"
                }`}
              >
                <span className="font-medium line-clamp-1">{recipe.title}</span>
                <span className="ml-2 font-mono text-xs text-text-muted">({recipe.calories} kcal)</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Recipe detail */}
        <main id="recipe-detail" className="flex-1 overflow-y-auto">
          {!selectedRecipe ? (
            <div className="flex items-center justify-center h-96 text-text-muted">
              <p>Selecciona una receta</p>
            </div>
          ) : (
            <div className="p-6">
              {/* Image */}
              <div className="relative w-full rounded-card overflow-hidden mb-6 bg-gray-100" style={{ aspectRatio: "16/9" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getImageUrl(selectedRecipe.image_url)}
                  alt={selectedRecipe.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1547592180-85f173990554?w=800&h=450&fit=crop";
                  }}
                />
              </div>

              {/* Title + calories */}
              <h2 className="text-2xl font-bold text-text-primary mb-1">
                {selectedRecipe.title}
                <span className="ml-2 font-mono text-lg text-secondary font-normal">
                  ({selectedRecipe.calories} kcal)
                </span>
              </h2>

              {/* Ingredients */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
                  Ingredientes
                </h3>
                <ul className="space-y-1.5">
                  {selectedRecipe.ingredients.map((ing, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-secondary flex-shrink-0" />
                      <span>
                        <span className="font-mono font-medium text-secondary">{ing.amount}</span>{" "}
                        <span className="text-text-primary">{ing.item}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Process */}
              <div className="mt-6 mb-10">
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
                  Preparación
                </h3>
                <ol className="space-y-3">
                  {selectedRecipe.process.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="text-text-primary pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
