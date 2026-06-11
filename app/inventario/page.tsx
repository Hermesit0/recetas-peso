"use client";

import { useState, useEffect, useRef } from "react";

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
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isListening, setIsListening] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>("");
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);

  // Load inventory on mount
  useEffect(() => {
    fetch("/api/inventory")
      .then((r) => r.json())
      .then((data) => {
        if (data.content !== undefined) {
          setContent(data.content);
          setUpdatedAt(data.updated_at || "");
          setLastSaved(data.updated_at || "");
        }
      })
      .catch(() => {});
  }, []);

  // Setup Web Speech API
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || (window as unknown as { webkitSpeechRecognition: typeof window.SpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "es-ES";

    recognition.onresult = (event: { results: { [key: number]: { transcript: string } }[] }) => {
      const transcript = Array.from(event.results)
        .map((result) => (result as any)[0]?.transcript || "")
        .join(" ");
      setContent((prev) => prev + (prev ? " " : "") + transcript);
    };

    recognition.onend = () => {
      if (isListening) {
        // Restart if still supposed to be listening
        try { recognition.start(); } catch {}
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, [isListening]);

  const handleSave = async () => {
    setStatus("saving");
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      setUpdatedAt(data.updated_at);
      setLastSaved(data.updated_at);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
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
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        {/* Instrucciones */}
        <div className="mb-4 p-4 bg-surface rounded-card border border-border">
          <p className="text-sm text-text-muted">
            <span className="font-semibold text-text-primary">Formato:</span> escribe un ingrediente por línea en sistema métrico.
            Ejemplo: <code className="font-mono text-xs bg-gray-100 px-1 rounded">tofu 500g</code> ·{" "}
            <code className="font-mono text-xs bg-gray-100 px-1 rounded">salsa soja 80ml</code>
          </p>
        </div>

        {/* Textarea */}
        <div className="mb-4">
          <textarea
            className="w-full h-80 p-4 rounded-card border border-border bg-surface text-text-primary resize-none focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all text-sm leading-relaxed"
            placeholder={"tofu 400g\nsalsa soja 50ml\ngengibre fresco 20g\ncebolla tierna 2 unidades"}
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

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={status === "saving"}
            className="flex items-center gap-2 px-5 py-2 rounded-btn bg-secondary text-white hover:bg-secondary/90 transition-all text-sm font-semibold disabled:opacity-50"
          >
            {status === "saving" ? (
              <>
                <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Guardando...
              </>
            ) : status === "saved" ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guardado
              </>
            ) : (
              "Guardar inventario"
            )}
          </button>

          {/* Timestamp */}
          {lastSaved && (
            <p className="text-xs text-text-muted ml-auto">
              Última actualización: {formatDate(lastSaved)}
            </p>
          )}
        </div>

        {status === "error" && (
          <p className="mt-3 text-sm text-red-500">Error al guardar. Inténtalo de nuevo.</p>
        )}
      </main>
    </div>
  );
}
