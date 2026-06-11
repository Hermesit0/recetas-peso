import Link from "next/link";

const sections = [
  {
    href: "/inventario",
    title: "Inventario",
    description: "Ingredientes disponibles en cocina",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    color: "bg-emerald-50 border-emerald-200 text-emerald-700",
  },
  {
    href: "/calendario",
    title: "Calendario",
    description: "Planificación de comidas del día",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
    color: "bg-blue-50 border-blue-200 text-blue-700",
  },
  {
    href: "/recetas",
    title: "Recetas",
    description: "Buscar y ver recetas orientales",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
    color: "bg-orange-50 border-orange-200 text-orange-700",
  },
  {
    href: "/peso",
    title: "Peso",
    description: "Seguimiento del peso corporal",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
    ),
    color: "bg-rose-50 border-rose-200 text-rose-700",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-white py-6 px-6 shadow-md">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold">Recetas — Control de Peso</h1>
          <p className="text-gray-300 text-sm mt-1">
            Orientación culinaria · 38 años · 82 kg → 72 kg
          </p>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto p-6">
        <p className="text-text-muted mb-8 text-center">
          Selecciona una sección para continuar
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {sections.map((section) => (
            <Link key={section.href} href={section.href}>
              <div
                className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 p-6 rounded-card border transition-all hover:shadow-md hover:-translate-y-0.5 ${section.color}`}
              >
                <div className="flex-shrink-0">{section.icon}</div>
                <div>
                  <h2 className="text-lg font-semibold">{section.title}</h2>
                  <p className="text-sm opacity-80 mt-1">{section.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick stats */}
        <div className="mt-10 p-5 bg-surface rounded-card border border-border">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
            Resumen del día
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold font-mono text-secondary">0</p>
              <p className="text-xs text-text-muted">kcal mañana</p>
            </div>
            <div>
              <p className="text-2xl font-bold font-mono text-secondary">0</p>
              <p className="text-xs text-text-muted">kcal mediodía</p>
            </div>
            <div>
              <p className="text-2xl font-bold font-mono text-accent">-10 kg</p>
              <p className="text-xs text-text-muted">para meta</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
