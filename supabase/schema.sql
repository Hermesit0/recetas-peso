-- ============================================================
-- Schema para Recetas — Control de Peso
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ============================================================

-- Tabla de recetas
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  calories INTEGER NOT NULL CHECK (calories > 0 AND calories < 2000),
  ingredients JSONB NOT NULL DEFAULT '[]',
  process JSONB NOT NULL DEFAULT '[]',
  image_query TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de inventario
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla del plan de comidas
CREATE TABLE IF NOT EXISTS meal_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  meal_time TEXT NOT NULL CHECK (meal_time IN ('09:00', '12:00')),
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  UNIQUE (date, meal_time)
);

-- Tabla de entradas de peso
CREATE TABLE IF NOT EXISTS weight_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weight_kg DECIMAL(4, 1) NOT NULL CHECK (weight_kg > 0 AND weight_kg < 500),
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Row Level Security (RLS) — deshabilitado por ahora
-- (no hay auth). Enable cuando añadas login.
-- ============================================================
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;

-- Policies abiertas (sin auth)
CREATE POLICY "Allow all on inventory" ON inventory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on meal_plan" ON meal_plan FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on recipes" ON recipes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on weight_entries" FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Índices para rendimiento
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_meal_plan_date ON meal_plan(date);
CREATE INDEX IF NOT EXISTS idx_recipes_title_ilike ON recipes(title varchar_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_weight_entries_recorded_at ON weight_entries(recorded_at DESC);
