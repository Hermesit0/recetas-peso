# SPEC.md — Recetas para Bajar de Peso

## 1. Concept & Vision

Una aplicación web de gestión alimentaria para un hombre de 38 años, 1.66m, 82kg que quiere bajar de peso reduciendo calorías. Estilo culinario: oriental. La app controla inventario de ingredientes, planifica comidas (9:00 y 12:00) en un calendario, muestra recetas con buscador, y hace seguimiento del peso. Interfaz limpia, funcional, sin florituras.

## 2. Design Language

### Aesthetic Direction
Minimalista funcional con acentos cálidos. Inspiración: apps de wellness japonesas — espacio en blanco generoso, tipografía legible, colores que transmiten salud y control.

### Color Palette
- Primary: `#1a1a2e` (azul oscuro profundo)
- Secondary: `#e94560` (rojo coral — para kcal, alertas, acción)
- Accent: `#f97316` (naranja — category highlights, CTAs secundarios)
- Background: `#fafafa` (blanco hueso)
- Surface: `#ffffff` (blanco puro para cards)
- Text primary: `#1f2937`
- Text muted: `#6b7280`
- Border: `#e5e7eb`

### Typography
- Headings: `Inter` (700 weight)
- Body: `Inter` (400, 500)
- Kcal/macros: `JetBrains Mono` (monospace para números)
- Fallback: system-ui

### Spatial System
- Base unit: 4px
- Card padding: 24px
- Section gap: 32px
- Border radius: 12px (cards), 8px (buttons/inputs)

### Motion Philosophy
- Transiciones suaves: 200ms ease-out para hovers
- Page transitions: fade 150ms
- No animaciones decorativas — todo tiene propósito funcional

## 3. Layout & Structure

### Navegación Principal (Landing)
4 cards en grid 2x2:
1. **Inventario** — gestión de ingredientes
2. **Calendario** — plan semanal de comidas
3. **Recetas** — buscador y detalle de recetas
4. **Peso** — tracker de peso corporal

### Responsive Strategy
- Mobile-first: stack vertical en móvil
- Desktop: grid 2x2 en landing, sidebar + main en recetas
- Breakpoints: sm 640px, md 768px, lg 1024px

## 4. Features & Interactions

### Landing Page (`/`)
- Grid 2x2 con las 4 secciones
- Cada card: icono + nombre + descripción breve
- Click → navegación a la sección

### Inventario (`/inventario`)
- **Campo de texto principal**: textarea editable con texto natural
  - Formato libre, líneas de "ingrediente: cantidad"
  - Ejemplo: " tofu 500g\n salsa soja 100ml\n jengibre fresco 30g"
- **Fecha de actualización**: timestamp visible, se actualiza al guardar
- **Botón guardar**: persiste en Supabase
- **Botón micrófono**: activa Web Speech API (`SpeechRecognition`)
  - Micro LED visual cuando está grabando
  - El texto reconocido se appendea al textarea
  - feedback auditivo de confirmación
- **Sincronización**: datos disponibles en móvil y PC

### Calendario (`/calendario`)
- Navegación entre días (flechas ← →)
- Header: día actual destacado
- Cada día muestra 2 slots: **09:00** y **12:00**
- Slot con receta: card con título + kcal, click abre receta
- Slot vacío: placeholder con icono "+"
- Botón "Hoy" para volver al día actual
- Al hacer click en un slot vacío: modal para asignar receta (buscador)

### Recetas (`/recetas`)
- **Buscador**: input en la parte superior
  - Live search con debounce 300ms
  - Despliega lista de matches a la izquierda
- **Vista detalle** (panel principal):
  - Foto de la receta (Unsplash con query oriental food)
  - Título con calorías entre paréntesis: "Tonkotsu Ramen (480 kcal)"
  - Lista de ingredientes (sistema métrico puro: g, ml, kg)
  - Proceso de preparación (pasos numerados)
- **Navegación**: al seleccionar otra receta, panel principal actualiza
- **Filtro**: ninguna categoría — solo búsqueda por título

### Tracker de Peso (`/peso`)
- **Input nuevo registro**: número en kg (1 decimal)
- **Botón añadir**: guarda fecha + peso
- **Historial**: lista de registros recientes (fecha + peso)
- **Gráfica**: línea temporal con evolución del peso
- **Meta**: peso objetivo 72kg (hardcoded, se muestra como referencia)
- **KPI**: diferencia con meta, avg semanal

## 5. Component Inventory

### `<NavBar>`
- Logo/nombre izquierda, navegación derecha
- Links: Inventario | Calendario | Recetas | Peso
- Mobile: hamburger menu

### `<InventoryCard>`
- Estados: loading, editing, saved, error
- Textarea + microfono + timestamp + guardar

### `<VoiceInput>`
- Icono micrófono
- Estados: idle, listening, processing
- Visual: microfono cambia de color cuando activo

### `<RecipeCard>` (en calendario y lista)
- Título truncado + kcal badge
- Estados: default, hover, selected

### `<RecipeDetail>`
- Imagen (aspect-ratio 16/9)
- Título con kcal
- Ingredientes (ul con checkmarks opcionales)
- Proceso (ol numerado)
- Estados: loading, loaded, empty

### `<MealSlot>`
- Hora + contenido (receta o vacío)
- Estados: filled, empty, hover

### `<WeightChart>`
- Gráfica SVG (línea + puntos)
- Eje X: fechas
- Eje Y: kg
- Línea meta horizontal (72kg)

### `<WeightEntry>`
- Input numérico + botón añadir
- Tabla de historial

## 6. Technical Approach

### Stack
| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Hosting | Vercel (free tier) |
| Git | GitHub (hermesit0) |
| LLM | OpenRouter (`openai/gpt-4o-mini`) — seed de recetas |

### Supabase Schema

```sql
-- Tabla de recetas
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  calories INTEGER NOT NULL,
  ingredients JSONB NOT NULL,  -- [{item: "tofu", amount: "500g"}, ...]
  process JSONB NOT NULL,       -- ["paso 1", "paso 2", ...]
  image_query TEXT,             -- query para Unsplash
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de inventario
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de plan de comidas
CREATE TABLE meal_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  meal_time TEXT NOT NULL CHECK (meal_time IN ('09:00', '12:00')),
  recipe_id UUID REFERENCES recipes(id),
  UNIQUE(date, meal_time)
);

-- Tabla de peso
CREATE TABLE weight_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weight_kg DECIMAL(4,1) NOT NULL,
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### API Routes
- `GET/POST /api/inventory` — leer/guardar inventario
- `GET /api/recipes` — lista todas las recetas
- `GET /api/recipes/search?q=` — buscar por título
- `GET /api/recipes/[id]` — detalle de receta
- `GET/POST /api/meal-plan?date=` — obtener/asignar comida
- `GET/POST /api/weight` — historial y nuevo registro

### Data Flow
1. Primera carga → API route consulta Supabase → renderiza datos
2. Guardado → API route hace INSERT/UPDATE en Supabase → actualiza UI
3. Búsqueda → API route filtra en Supabase por título (`ilike`)

### Seed de Recetas (antes del deploy)
- Script que usa OpenRouter para generar 20 recetas orientales bajas en kcal
- Inserta directamente en Supabase via API route `/api/seed`
- Solo se ejecuta una vez

### Environment Variables (Vercel)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
OPENROUTER_API_KEY=sk-or-v1-...
```
