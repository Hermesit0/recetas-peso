"use client";

import { useState, useEffect } from "react";

interface WeightEntry {
  id: string;
  weight_kg: number;
  recorded_at: string;
}

const TARGET_WEIGHT = 72;
const GOAL_LOSS = 10; // 82 - 72

export default function PesoPage() {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [newWeight, setNewWeight] = useState<string>("");
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; weight: number; date: string } | null>(null);
  const [status, setStatus] = useState<"idle" | "adding" | "added">("idle");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetch("/api/weight")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setEntries(data);
      })
      .catch(() => {});
  }, []);

  const handleAdd = async () => {
    const weight = parseFloat(newWeight);
    if (!weight || weight < 30 || weight > 200) {
      setError("Peso inválido. Introduce un valor entre 30 y 200 kg.");
      return;
    }
    setError("");
    setStatus("adding");
    try {
      const res = await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weight_kg: weight }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEntries((prev) => [data, ...prev]);
      setNewWeight("");
      setStatus("added");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setError("Error al guardar. Inténtalo de nuevo.");
      setStatus("idle");
    }
  };

  const currentWeight = entries[0]?.weight_kg;
  const diffFromGoal = currentWeight ? currentWeight - TARGET_WEIGHT : null;

  // Simple SVG chart
  const renderChart = () => {
    if (entries.length < 2) return null;

    const sorted = [...entries]
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
      .slice(-14); // last 14 entries

    const weights = sorted.map((e) => e.weight_kg);
    const minW = Math.floor(Math.min(...weights) - 1);
    const maxW = Math.ceil(Math.max(...weights) + 1);
    const range = maxW - minW || 1;

    const W = 600;
    const H = 200;
    const padX = 50;
    const padY = 20;

    const xStep = (W - padX) / Math.max(sorted.length - 1, 1);

    const points = sorted.map((e, i) => {
      const x = padX + i * xStep;
      const y = padY + (1 - (e.weight_kg - minW) / range) * (H - padY * 2);
      return { x, y, weight: e.weight_kg, date: e.recorded_at };
    });

    const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

    const targetY =
      padY + (1 - (TARGET_WEIGHT - minW) / range) * (H - padY * 2);

    return (
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: "240px" }}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = padY + t * (H - padY * 2);
            const wVal = maxW - t * range;
            return (
              <g key={t}>
                <line
                  x1={padX}
                  y1={y}
                  x2={W - 10}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth={1}
                />
                <text x={padX - 5} y={y + 4} textAnchor="end" fontSize="10" fill="#6b7280">
                  {wVal.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* X-axis date labels — show first, middle and last */}
          {points.filter((_, i) => i === 0 || i === Math.floor(points.length / 2) || i === points.length - 1).map((p, _) => (
            <text key={p.date} x={p.x} y={H - 2} textAnchor="middle" fontSize="9" fill="#6b7280">
              {new Date(p.date + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })}
            </text>
          ))}

          {/* Target line */}
          <line
            x1={padX}
            y1={targetY}
            x2={W - 10}
            y2={targetY}
            stroke="#f97316"
            strokeWidth={1.5}
            strokeDasharray="6 4"
          />
          <text x={W - 8} y={targetY + 4} fontSize="10" fill="#f97316" textAnchor="start">
            meta {TARGET_WEIGHT}kg
          </text>

          {/* Line */}
          <polyline
            points={polylinePoints}
            fill="none"
            stroke="#e94560"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points with hover */}
          {points.map((p, i) => (
            <g
              key={p.date}
              onMouseEnter={() => setHoveredPoint(p)}
              onMouseLeave={() => setHoveredPoint(null)}
              style={{ cursor: "pointer" }}
            >
              <circle key={i} cx={p.x} cy={p.y} r={hoveredPoint?.date === p.date ? 6 : 4} fill="#e94560" stroke="#fff" strokeWidth={2} />
            </g>
          ))}
        </svg>

        {/* Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg pointer-events-none z-10"
            style={{
              left: hoveredPoint.x,
              top: hoveredPoint.y - 40,
              transform: "translateX(-50%)",
            }}
          >
            <p className="font-mono font-bold text-base">{hoveredPoint.weight.toFixed(1)} kg</p>
            <p className="text-gray-300">
              {new Date(hoveredPoint.date + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        )}
      </div>
    );
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-white py-4 px-6 shadow-md">
        <div className="max-w-2xl mx-auto">
          <nav className="text-sm text-gray-300 mb-1">
            <a href="/" className="hover:text-white transition-colors">Inicio</a>
            <span className="mx-2">/</span>
            <span className="text-white">Peso</span>
          </nav>
          <h1 className="text-xl font-bold">Tracker de Peso</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-surface rounded-card border border-border p-4 text-center">
            <p className="font-mono text-2xl font-bold text-text-primary">
              {currentWeight ? currentWeight.toFixed(1) : "—"}
            </p>
            <p className="text-xs text-text-muted mt-1">kg actual</p>
          </div>
          <div className="bg-surface rounded-card border border-border p-4 text-center">
            <p className={`font-mono text-2xl font-bold ${diffFromGoal !== null && diffFromGoal <= 0 ? "text-emerald-500" : "text-accent"}`}>
              {diffFromGoal !== null ? `${diffFromGoal > 0 ? "+" : ""}${diffFromGoal.toFixed(1)}` : "—"}
            </p>
            <p className="text-xs text-text-muted mt-1">para meta</p>
          </div>
          <div className="bg-surface rounded-card border border-border p-4 text-center">
            <p className="font-mono text-2xl font-bold text-secondary">{TARGET_WEIGHT}</p>
            <p className="text-xs text-text-muted mt-1">kg meta</p>
          </div>
        </div>

        {/* New entry form */}
        <div className="bg-surface rounded-card border border-border p-5 mb-6">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
            Nuevo registro
          </h2>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <input
                type="number"
                step="0.1"
                min="30"
                max="200"
                placeholder="Peso en kg"
                className="w-full px-4 py-2.5 rounded-btn border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all font-mono text-lg"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">kg</span>
            </div>
            <button
              onClick={handleAdd}
              disabled={status === "adding" || !newWeight}
              className="px-6 py-2.5 rounded-btn bg-secondary text-white font-semibold hover:bg-secondary/90 transition-all disabled:opacity-50 text-sm"
            >
              {status === "added" ? "✓" : status === "adding" ? "..." : "Añadir"}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        </div>

        {/* Chart */}
        {entries.length >= 2 && (
          <div className="bg-surface rounded-card border border-border p-5 mb-6">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-4">
              Evolución (últimas 2 semanas)
            </h2>
            {renderChart()}
          </div>
        )}

        {/* History */}
        <div className="bg-surface rounded-card border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">
              Historial
            </h2>
          </div>
          <div className="divide-y divide-border">
            {entries.length === 0 && (
              <p className="text-center text-sm text-text-muted py-8">
                Sin registros aún. Añade tu primer peso.
              </p>
            )}
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-mono text-lg font-semibold text-text-primary">
                    {entry.weight_kg.toFixed(1)}
                    <span className="text-sm text-text-muted ml-1">kg</span>
                  </p>
                  <p className="text-xs text-text-muted">{formatDate(entry.recorded_at)}</p>
                </div>
                <div className="text-right">
                  {TARGET_WEIGHT && (
                    <p
                      className={`text-xs font-mono ${
                        entry.weight_kg <= TARGET_WEIGHT ? "text-emerald-500" : "text-text-muted"
                      }`}
                    >
                      {entry.weight_kg > TARGET_WEIGHT
                        ? `+${(entry.weight_kg - TARGET_WEIGHT).toFixed(1)}`
                        : "en meta"}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
