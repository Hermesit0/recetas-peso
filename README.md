# Recetas — Control de Peso

App web para gestión alimentaria y control de peso. Estilo oriental, sistema métrico.

## Stack

- **Frontend:** Next.js 14 (App Router) + Tailwind CSS
- **BD:** Supabase (PostgreSQL)
- **LLM:** OpenRouter (GPT-4o-mini) — seed de recetas
- **Hosting:** Vercel (free tier)
- **Git:** GitHub

## Setup

### 1. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) → New Project
2. Elige región cercana (eu-west-1 o similar)
3. Anota el **Project URL** y el **anon/public key** (Settings → API)

### 2. Crear las tablas

Ve a **SQL Editor** en el dashboard de Supabase y ejecuta el contenido de:

```
supabase/schema.sql
```

### 3. Configurar variables de entorno

Copia `.env.example` a `.env.local` y rellena:

```bash
cp .env.example .env.local
# Edita .env.local con tus valores de Supabase y OpenRouter
```

### 4. Instalar dependencias y ejecutar localmente

```bash
npm install
npm run dev
```

### 5. Seed de recetas (primera vez)

Con el servidor corriendo, ejecuta:

```bash
curl -X POST http://localhost:3000/api/seed
```

Esto genera 20 recetas orientales bajas en calorías usando LLM y las inserta en la BBDD.

### 6. Desplegar en Vercel

1. Sube el código a GitHub (repo nuevo o existente)
2. Ve a [vercel.com](https://vercel.com) → Import → selecciona tu repo
3. En **Environment Variables** añade:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENROUTER_API_KEY`
4. Deploy — la app estará en `https://tu-repo.vercel.app`

## Funcionalidades

| Apartado | Descripción |
|----------|-------------|
| **Inventario** | Texto editable + voz (Web Speech API), guardado en Supabase |
| **Calendario** | 2 slots por día (09:00 y 12:00), navegación entre días, asignar receta |
| **Recetas** | Buscador live, lista de resultados, detalle con foto/ingredientes/proceso |
| **Peso** | Nuevo registro, historial, gráfica SVG, meta 72 kg |

## Notas

- No hay auth de momento. Los datos son accesibles para cualquiera con la URL.
- Web Speech API requiere Chrome o navegador basado en Chromium.
- Las imágenes de recetas usan Unsplash (source.unsplash.com).
- Peso meta: 72 kg hardcoded. Cambio futuro: hacerlo configurable.

## Estructura del proyecto

```
recetas-peso/
├── app/
│   ├── layout.tsx
│   ├── page.tsx           # Landing
│   ├── globals.css
│   ├── inventario/page.tsx
│   ├── calendario/page.tsx
│   ├── recetas/page.tsx
│   ├── peso/page.tsx
│   └── api/
│       ├── inventory/route.ts
│       ├── recipes/route.ts
│       ├── recipes/search/route.ts
│       ├── meal-plan/route.ts
│       ├── weight/route.ts
│       └── seed/route.ts
├── lib/supabase.ts
├── supabase/schema.sql
└── SPEC.md
```
