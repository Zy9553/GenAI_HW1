import { NextRequest } from "next/server";
import {
  extractFoodCaloriesQueryFromText,
  getFoodCalories,
  FoodCaloriesQuery,
} from "@/lib/mcp/foodCaloriesTool";

function parseStructuredQuery(body: unknown): FoodCaloriesQuery | null {
  if (!body || typeof body !== "object") return null;

  const raw = body as Record<string, unknown>;
  if (typeof raw.food !== "string") return null;

  return {
    food: raw.food,
    amount: typeof raw.amount === "number" ? raw.amount : undefined,
    unit: typeof raw.unit === "string" ? (raw.unit as FoodCaloriesQuery["unit"]) : undefined,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    let query: FoodCaloriesQuery | null = null;
    if (typeof body?.text === "string") {
      query = extractFoodCaloriesQueryFromText(body.text);
    }

    if (!query) {
      query = parseStructuredQuery(body);
    }

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Provide { text } or { food, amount?, unit? }" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const result = await getFoodCalories(query);
    return new Response(
      JSON.stringify({
        tool: "get_food_calories",
        query,
        result,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function GET(req: NextRequest) {
  const text = req.nextUrl.searchParams.get("text");
  const food = req.nextUrl.searchParams.get("food");
  const amount = req.nextUrl.searchParams.get("amount");
  const unit = req.nextUrl.searchParams.get("unit");

  let query: FoodCaloriesQuery | null = null;
  if (text) {
    query = extractFoodCaloriesQueryFromText(text);
  }

  if (!query && food) {
    const parsedAmount = amount ? Number(amount) : undefined;
    query = {
      food,
      amount: typeof parsedAmount === "number" && Number.isFinite(parsedAmount)
        ? parsedAmount
        : undefined,
      unit: unit ? (unit as FoodCaloriesQuery["unit"]) : undefined,
    };
  }

  if (!query) {
    return new Response(
      JSON.stringify({ error: "Provide query params text or food" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const result = await getFoodCalories(query);
  return new Response(
    JSON.stringify({
      tool: "get_food_calories",
      query,
      result,
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
}