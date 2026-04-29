export type FoodCaloriesUnit = "g" | "ml" | "piece" | "bowl" | "cup" | "serving";

export type FoodCaloriesQuery = {
  food: string;
  amount?: number;
  unit?: FoodCaloriesUnit;
};

export type FoodCaloriesCitation = {
  title: string;
  url: string;
  accessedAt: string;
};

export type FoodCaloriesResult = {
  found: boolean;
  query: {
    food: string;
    amount: number;
    unit: FoodCaloriesUnit;
  };
  matchedFood?: string;
  fdcId?: number;
  kcalPer100g?: number;
  estimatedGrams?: number;
  estimatedCalories?: number;
  source: "USDA";
  citation?: FoodCaloriesCitation;
  note: string;
};
type UsdaFoodNutrient = {
  nutrientName?: string;
  nutrientNumber?: string;
  unitName?: string;
  value?: number;
};

type UsdaFood = {
  fdcId?: number;
  description?: string;
  foodNutrients?: UsdaFoodNutrient[];
};

type UsdaFoodSearchResponse = {
  foods?: UsdaFood[];
};

const USDA_API_BASE = "https://api.nal.usda.gov/fdc/v1/foods/search";
const GROQ_CHAT_BASE = "https://api.groq.com/openai/v1/chat/completions";
const TRANSLATE_MODEL = "llama-3.1-8b-instant";
const CALORIE_INTENT_PATTERN = /(熱量|卡路里|calorie|calories|kcal)/i;
const AMOUNT_PATTERN = /(\d+(?:\.\d+)?)\s*(g|gram|grams|公克|克|ml|毫升|cc|個|顆|份|碗|杯)/i;
const REMOVE_NOISE_PATTERN = /(熱量|卡路里|calorie|calories|kcal|查詢|查|幫我|請問|一下|多少|幾|是多少|的|\?|？)/gi;
const NON_ASCII_PATTERN = /[^\x00-\x7F]/;

function normalizeFoodCaloriesUnit(raw?: string): FoodCaloriesUnit {
  if (!raw) return "serving";

  const unit = raw.toLowerCase();
  if (unit === "g" || unit === "gram" || unit === "grams" || unit === "公克" || unit === "克") {
    return "g";
  }
  if (unit === "ml" || unit === "毫升" || unit === "cc") {
    return "ml";
  }
  if (unit === "個" || unit === "顆") {
    return "piece";
  }
  if (unit === "碗") {
    return "bowl";
  }
  if (unit === "杯") {
    return "cup";
  }
  return "serving";
}

function estimateGrams(amount: number, unit: FoodCaloriesUnit): number {
  if (unit === "g" || unit === "ml") {
    return amount;
  }
  if (unit === "piece") {
    return amount * 50;
  }
  if (unit === "bowl") {
    return amount * 150;
  }
  if (unit === "cup") {
    return amount * 240;
  }
  return amount * 100;
}

function extractFoodNameFromText(text: string): string {
  return text
    .replace(AMOUNT_PATTERN, " ")
    .replace(REMOVE_NOISE_PATTERN, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractKcalPer100g(food: UsdaFood): number | null {
  if (!Array.isArray(food.foodNutrients)) return null;

  const energyNutrient = food.foodNutrients.find((nutrient) => {
    const name = (nutrient.nutrientName || "").toLowerCase();
    const number = nutrient.nutrientNumber || "";
    const unit = (nutrient.unitName || "").toUpperCase();
    return unit === "KCAL" && (name.includes("energy") || number === "208" || number === "1008");
  });

  if (!energyNutrient || typeof energyNutrient.value !== "number") return null;
  return energyNutrient.value;
}

function buildUsdaCitation(fdcId?: number): FoodCaloriesCitation {
  const detailUrl =
    typeof fdcId === "number"
      ? `https://fdc.nal.usda.gov/fdc-app.html#/food-details/${fdcId}/nutrients`
      : USDA_API_BASE;

  return {
    title:
      typeof fdcId === "number"
        ? `USDA FoodData Central (FDC ID: ${fdcId})`
        : "USDA FoodData Central API",
    url: detailUrl,
    accessedAt: new Date().toISOString(),
  };
}

async function translateFoodNameToEnglish(foodName: string): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const trimmed = foodName.trim();
  if (!trimmed || !NON_ASCII_PATTERN.test(trimmed)) return null;

  try {
    const response = await fetch(GROQ_CHAT_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: TRANSLATE_MODEL,
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "Translate the food name to English. Return only the translated food name without extra words or punctuation.",
          },
          { role: "user", content: trimmed },
        ],
      }),
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const translated = payload.choices?.[0]?.message?.content?.trim();
    if (!translated) return null;

    return translated.replace(/^"|"$/g, "").trim() || null;
  } catch {
    return null;
  }
}

async function searchUsdaFood(foodName: string): Promise<UsdaFood | null> {
  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) {
    return null;
  }

  const url = `${USDA_API_BASE}?api_key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: foodName,
      pageSize: 8,
      dataType: ["Foundation", "SR Legacy", "Survey (FNDDS)"],
    }),
  });

  if (!response.ok) {
    throw new Error(`USDA request failed (${response.status})`);
  }

  const payload = (await response.json()) as UsdaFoodSearchResponse;
  const foods = Array.isArray(payload.foods) ? payload.foods : [];

  const withEnergy = foods.find((food) => typeof extractKcalPer100g(food) === "number");
  return withEnergy || null;
}

export async function getFoodCalories(input: FoodCaloriesQuery): Promise<FoodCaloriesResult> {
  const normalizedFood = (input.food || "").trim();
  const amount =
    typeof input.amount === "number" && Number.isFinite(input.amount) && input.amount > 0
      ? input.amount
      : 1;
  const unit = normalizeFoodCaloriesUnit(input.unit);
  const translatedFood = await translateFoodNameToEnglish(normalizedFood);
  const translationNote =
    translatedFood && translatedFood.toLowerCase() !== normalizedFood.toLowerCase()
      ? `Translated query to English as "${translatedFood}". `
      : "";

  if (!process.env.USDA_API_KEY) {
    return {
      found: false,
      query: {
        food: normalizedFood,
        amount,
        unit,
      },
      source: "USDA",
      note: `${translationNote}Missing USDA_API_KEY. Please set USDA_API_KEY in environment variables.`,
    };
  }

  const targetFood = (translatedFood || normalizedFood || "food").trim();

  let matched: UsdaFood | null = null;
  try {
    matched = await searchUsdaFood(targetFood);
  } catch {
    return {
      found: false,
      query: {
        food: normalizedFood,
        amount,
        unit,
      },
      source: "USDA",
      note: `${translationNote}USDA query failed. Please try again later.`,
    };
  }

  const kcalPer100g = matched ? extractKcalPer100g(matched) : null;

  if (!matched || typeof kcalPer100g !== "number") {
    return {
      found: false,
      query: {
        food: normalizedFood,
        amount,
        unit,
      },
      source: "USDA",
      citation: buildUsdaCitation(),
      note: `${translationNote}Food not found from USDA with usable kcal data.`,
    };
  }

  const grams = estimateGrams(amount, unit);
  const calories = Math.round((grams * kcalPer100g) / 100);

  return {
    found: true,
    query: {
      food: normalizedFood,
      amount,
      unit,
    },
    matchedFood: matched.description || targetFood,
    fdcId: matched.fdcId,
    kcalPer100g,
    estimatedGrams: Math.round(grams),
    estimatedCalories: calories,
    source: "USDA",
    citation: buildUsdaCitation(matched.fdcId),
    note: `${translationNote}Estimated using USDA FoodData Central values (typically per 100g); actual calories vary by preparation.`,
  };
}

export function extractFoodCaloriesQueryFromText(text: string): FoodCaloriesQuery | null {
  const normalizedText = (text || "").trim();
  if (!normalizedText) return null;
  if (!CALORIE_INTENT_PATTERN.test(normalizedText)) return null;

  const amountMatch = normalizedText.match(AMOUNT_PATTERN);
  const amount = amountMatch ? Number(amountMatch[1]) : undefined;
  const unit = amountMatch ? normalizeFoodCaloriesUnit(amountMatch[2]) : undefined;

  const parsedFood = extractFoodNameFromText(normalizedText);

  return {
    food: parsedFood || normalizedText,
    amount,
    unit,
  };
}

export async function runFoodCaloriesToolFromText(text: string) {
  const query = extractFoodCaloriesQueryFromText(text);
  if (!query) return null;

  return {
    toolName: "get_food_calories",
    query,
    result: await getFoodCalories(query),
  };
}