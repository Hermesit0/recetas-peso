#!/usr/bin/env python3
"""Seed recipes directly into Supabase via REST API."""
import json, time, urllib.request

SUPABASE_URL = "https://yfulkwvqlwqduwfrdxts.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmdWxrd3ZxbHdxZHV3ZnJkeHRzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTE3MDg4MiwiZXhwIjoyMDk2NzQ2ODgyfQ.3LCTvJG510VymZA4tzzU3sKPLhE-Orb5Z6wCyOeRCV0"
OPENROUTER_KEY = "sk-or-v1-placeholder"

def supabase_headers():
    return {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}", "Content-Type": "application/json"}

def rpc(fn, params):
    data = json.dumps({"fn": fn, "args": params}).encode()
    req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/rpc/{fn}", data=data, headers=supabase_headers())
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read())
    except Exception as e:
        return {"error": str(e)}

RECIPE_PROMPTS = [
    "Ramen bajo en calorías con caldo dashi light, fideos soba, tofu, alga nori y verduras. Máximo 350 kcal.",
    "Ensalada de mango y pollo al estilo tailandés con salsa de fish sauce light, menta y lima. Máximo 320 kcal.",
    "Pollo yakitori bajo en grasa hecho en wok con salsa soja diluida, cebolleta y sésamo. Máximo 300 kcal.",
    "Sopa miso tradicional light con tofu, wakame y cebolleta. Máximo 150 kcal.",
    "Bibimbap coreano light con arroz integral, verduras salteadas, huevo pochado y gochujang diluido. Máximo 400 kcal.",
    "Gyoza al vapor con relleno de cerdo magro y col, salsa para dipping light. Máximo 320 kcal.",
    "Pad thai bajo en calorías con fideos de arroz, gambas, tofu, cacahuetes y lima. Máximo 380 kcal.",
    "Curry rojo tailandés light con leche de coco reducida, pollo desmenuzado, bambú y Thai basil. Máximo 340 kcal.",
    "Onigiri bajo en sodio con arroz, alga nori y relleno de atún light mezclado con mayonesa. Máximo 220 kcal.",
    "Soba frío (zaru soba) con salsa de ichimi dashi, rábano daikon rallado y sésamo. Máximo 280 kcal.",
    "Bao buns al vapor con masa integral y relleno de cerdo magro y cebolleta china. Máximo 300 kcal.",
    "Kimchi jjigae coreano light con kimchi fermentation reducida, tofu y arroz integral. Máximo 290 kcal.",
    "Dim sum al vapor: har gow y siu mai bajos en grasa, servidos con salsa de ostra diluida. Máximo 340 kcal.",
    "Udon en caldo dashi light con verduras tempura (solo 2 piezas) y wakame. Máximo 350 kcal.",
    "Poke bowl bajo en calorías con tofu marinado en salsa de soja, arroz integral, edamame y aguacate. Máximo 380 kcal.",
    "Sopa agripicante china con pollo desmenuzado, bamboo shoots y vinagre de arroz. Máximo 180 kcal.",
    "Fideos de arroz con stir-fry de brócoli y pollo al jengibre, salsa hoisin diluida. Máximo 360 kcal.",
    "Noodles udon fríos con cobertura de pepino, zanahoria rallada, germen de soja y salsa de sésamo light. Máximo 260 kcal.",
    "Cerdo agridulce light con pineapple fresco, pimiento y cebolla, al horno. Máximo 320 kcal.",
    "Shakshuka oriental con huevos, tomate, pimiento, comino y paprika, servido con pan integral. Máximo 280 kcal.",
]

def generate_recipe(prompt):
    """Generate a single recipe using OpenRouter."""
    import urllib.request
    payload = {
        "model": "deepseek/deepseek-v4-flash",
        "messages": [
            {"role": "system", "content": "Eres un chef nutricionista especializado en cocina oriental baja en calorías. Responde SOLO con JSON válido, sin texto antes ni después. Formato: {\"title\": \"...\", \"calories\": número, \"ingredients\": [{\"item\": \"...\", \"amount\": \"...g\"}], \"process\": [\"paso 1\", \"paso 2\"], \"image_url\": \"https://images.unsplash.com/photo-XXXXXXXX?w=400\"}"},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,
        "max_tokens": 600,
    }
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {OPENROUTER_KEY}", "Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.loads(r.read())
            content = data["choices"][0]["message"]["content"]
            return json.loads(content)
    except Exception as e:
        print(f"  ERROR: {e}")
        return None

def insert_recipe(recipe):
    """Insert a recipe into Supabase recipes table."""
    import urllib.request
    # Parse ingredients - convert [{item, amount}] to string format
    if isinstance(recipe.get("ingredients"), list):
        ing_str = ", ".join(f"{i.get('item','')} {i.get('amount','')}" for i in recipe["ingredients"])
    else:
        ing_str = str(recipe.get("ingredients", ""))

    process = recipe.get("process", [])
    if isinstance(process, list):
        process_str = ". ".join(process)
    else:
        process_str = str(process)

    payload = {
        "title": recipe.get("title", "Sin título"),
        "calories": int(recipe.get("calories", 0)),
        "ingredients": ing_str,
        "process": process_str,
        "image_url": recipe.get("image_url", ""),
    }

    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/recipes",
        data=json.dumps(payload).encode(),
        headers=supabase_headers(),
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status == 201
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        print(f"  HTTP {e.code}: {err[:200]}")
        return False

def get_openrouter_key():
    """Try to get the OpenRouter key from the local env or .env file."""
    # Check .env.local
    try:
        with open("/home/agentest/.hermes/hermes-agent/recetas-peso/.env.local") as f:
            for line in f:
                if line.startswith("OPENROUTER_API_KEY"):
                    return line.split("=", 1)[1].strip()
    except:
        pass
    return None

def main():
    global OPENROUTER_KEY

    # Try to get key from local .env
    key = get_openrouter_key()
    if key and key != "sk-or-v1-placeholder" and len(key) > 20:
        OPENROUTER_KEY = key
        print(f"✓ OpenRouter key found locally")
    else:
        print("⚠ No local OPENROUTER_API_KEY found in .env.local")
        print("  Please paste your OpenRouter API key below to proceed with seeding.")
        print("  (Format: sk-or-v1-...)")
        return

    print(f"\nGenerating and inserting {len(RECIPE_PROMPTS)} recipes...\n")
    success = 0
    for i, prompt in enumerate(RECIPE_PROMPTS, 1):
        print(f"[{i}/{len(RECIPE_PROMPTS)}] Generating: {prompt[:50]}...")
        recipe = generate_recipe(prompt)
        if recipe:
            ok = insert_recipe(recipe)
            if ok:
                success += 1
                print(f"  ✓ Inserted: {recipe.get('title', '?')}")
            else:
                print(f"  ✗ Failed to insert")
        time.sleep(0.3)

    print(f"\n=== Done: {success}/{len(RECIPE_PROMPTS)} recipes seeded ===")

if __name__ == "__main__":
    main()
