"use client";

import { useState, useEffect, useRef } from "react";

interface InventoryItem {
  item: string;
  quantity: number;
  unit: string;
}

interface InventoryData {
  content: string;
  updated_at: string | null;
  items: InventoryItem[];
}

// Web Speech API types
type SpeechRecognitionType = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: { results: { [key: number]: { transcript: string } }[] }) => void;
  onend: () => void;
  onerror: () => void;
  start: () => void;
  stop: () => void;
};

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionType;
    webkitSpeechRecognition: new () => SpeechRecognitionType;
  }
}

export default function InventarioPage() {
  const [content, setContent] = useState<string>("");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "saving" | "processing" | "saved" | "error">("idle");
  const [isListening, setIsListening] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>("");
  const [showItems, setShowItems] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);

  // Load inventory on mount
  useEffect(() => {
    fetch("/api/inventory")
      .then((r) => r.json())
      .then((data: InventoryData) => {
        if (data.content !== undefined) {
          setContent(data.content ?? "");
          setItems(data.items ?? []);
          setUpdatedAt(data.updated_at ?? "");
          setLastSaved(data.updated_at ?? "");
          if ((data.items ?? []).length > 0) setShowItems(true);
        }
      })
      .catch(() => {});
  }, []);

  // Setup Web Speech API
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition: typeof window.SpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "es-ES";

    recognition.onresult = (event: { results: { [key: number]: { transcript: string } }[] }) => {
      const transcript = Array.from(event.results)
        .map((result) => (result as unknown as { transcript: string })[0]?.transcript || "")
        .join(" ");
      setContent((prev) => prev + (prev ? " " : "") + transcript);
    };

    recognition.onend = () => {
      if (isListening) {
        try { recognition.start(); } catch {}
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, [isListening]);

  const handleSave = async () => {
    setStatus("processing");
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data: InventoryData = await res.json();
      setUpdatedAt(data.updated_at ?? "");
      setLastSaved(data.updated_at ?? "");
      setItems(data.items ?? []);
      if ((data.items ?? []).length > 0) setShowItems(true);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const toggleVoice = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {}
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const totalKcal = items.reduce((sum, it) => {
    // Rough estimate: protein 4kcal/g, carbs 4kcal/g, fat 9kcal/ml
    // For inventory items, approximate calories per 100g
    const caloricDensity: Record<string, number> = {
      arroz: 130, tofu: 76, pollo: 165, ternera: 250, cerdo: 242,
      Aceite: 884, Aceite_sésamo: 884, "aceite sésamo": 884,
      brócoli: 34, espinacas: 23, zanahoria: 41, cebolla: 40,
      ajo: 149, jengibre: 80, pimiento: 31,
      salsa_soja: 53, "salsa soja": 53, miel: 304,
      fideos: 360, noodles: 360, pasta: 131,
    };
    const key = it.item.toLowerCase();
    const density = Object.entries(caloricDensity).find(([k]) => key.includes(k));
    const per100g = density ? density[1] : 50;
    return sum + (it.quantity * per100g) / 100;
  }, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-white py-4 px-6 shadow-md">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <nav className="text-sm text-gray-300 mb-1">
              <a href="/" className="hover:text-white transition-colors">Inicio</a>
              <span className="mx-2">/</span>
              <span className="text-white">Inventario</span>
            </nav>
            <h1 className="text-xl font-bold">Inventario de Ingredientes</h1>
          </div>
          {items.length > 0 && (
            <div className="text-right">
              <p className="font-mono text-lg font-bold text-white">{Math.round(totalKcal)}</p>
              <p className="text-xs text-gray-300">kcal aprox. totales</p>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        {/* Instructions */}
        <div className="mb-4 p-4 bg-surface rounded-card border border-border">
          <p className="text-sm text-text-muted">
            <span className="font-semibold text-text-primary">Escribe o dicta</span> los ingredientes que tengas.
            El sistema los procesará y mostrará en formato estructurado. Sistema métricoonly.
          </p>
        </div>

        {/* Textarea */}
        <div className="mb-4">
          <textarea
            className="w-full h-64 p-4 rounded-card border border-border bg-surface text-text-primary resize-none focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all text-sm leading-relaxed"
            placeholder={"tengo 500g de arroz, 300g de tofu, salsa soja 80ml, gengibre fresco 20g, cebolla tierna 2 unidades"}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Voice button */}
          <button
            onClick={toggleVoice}
            disabled={!recognitionRef.current}
            className={`flex items-center gap-2 px-4 py-2 rounded-btn border transition-all text-sm font-medium ${
              isListening
                ? "bg-secondary text-white border-secondary animate-pulse"
                : "bg-surface border-border text-text-primary hover:border-secondary hover:text-secondary"
            }`}
            title={recognitionRef.current ? "Activar voz" : "Navegador no soporta Web Speech API"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            {isListening ? "Detener" : "Voz"}
          </button>

          {/* Save / Process button */}
          <button
            onClick={handleSave}
            disabled={status === "saving" || status === "processing"}
            className="flex items-center gap-2 px-5 py-2 rounded-btn bg-secondary text-white hover:bg-secondary/90 transition-all text-sm font-semibold disabled:opacity-50"
          >
            {status === "processing" ? (
              <>
                <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Procesando con IA...
              </>
            ) : status === "saved" ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Procesado
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Procesar inventario
              </>
            )}
          </button>

          {lastSaved && (
            <p className="text-xs text-text-muted ml-auto">Actualizado: {formatDate(lastSaved)}</p>
          )}
        </div>

        {status === "error" && (
          <p className="mt-3 text-sm text-red-500">Error al procesar. Inténtalo de nuevo.</p>
        )}

        {/* Parsed items view */}
        {items.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setShowItems((v) => !v)}
              className="flex items-center gap-2 mb-3 text-sm font-semibold text-text-primary hover:text-secondary transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`w-4 h-4 transition-transform ${showItems ? "rotate-90" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              Ingredientes parseados ({items.length})
            </button>

            {showItems && (
              <div className="bg-surface rounded-card border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-border">
                      <th className="text-left px-4 py-2 font-semibold text-text-primary">Ingrediente</th>
                      <th className="text-right px-4 py-2 font-semibold text-text-primary">Cantidad</th>
                      <th className="text-right px-4 py-2 font-semibold text-text-primary">Unidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="px-4 py-2 text-text-primary capitalize">{it.item}</td>
                        <td className="px-4 py-2 text-right font-mono text-secondary font-medium">
                          {it.quantity > 0 ? it.quantity : "—"}
                        </td>
                        <td className="px-4 py-2 text-right text-text-muted">{it.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
