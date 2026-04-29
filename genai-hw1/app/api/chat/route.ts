import { NextRequest } from "next/server";
import { runFoodCaloriesToolFromText } from "@/lib/mcp/foodCaloriesTool";

type IncomingMessage = {
  role: "system" | "user" | "assistant";
  content: string;
  imageDataUrl?: string;
};

const AUTO_MODEL = "auto";
const DEFAULT_MODEL = "llama-3.1-8b-instant";
const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const CODE_MODEL = "llama-3.3-70b-versatile";
const LONG_CONTEXT_MODEL = "qwen/qwen3-32b";

function pickAutoModel(messages: IncomingMessage[]): { model: string; reason: string } {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
  const totalChars = messages.reduce(
    (sum, message) => sum + (typeof message.content === "string" ? message.content.length : 0),
    0
  );
  const hasImage = messages.some(
    (message) => message.role === "user" && typeof message.imageDataUrl === "string"
  );

  if (hasImage) {
    return { model: VISION_MODEL, reason: "image-input" };
  }

  const text = (lastUserMessage?.content || "").toLowerCase();
  const codeLikePattern =
    /```|\b(code|debug|bug|refactor|function|api|sql|python|javascript|typescript|algorithm|stack trace|traceback)\b|程式|除錯|錯誤|演算法|函式/i;
  const deepReasoningPattern =
    /\b(architecture|design|strategy|compare|analysis|research|proof|derive|optimi[sz]e)\b|深入|比較|分析|研究|推導|設計/i;

  if (totalChars > 8000) {
    return { model: LONG_CONTEXT_MODEL, reason: "long-context" };
  }

  if (codeLikePattern.test(text) || text.length > 1200) {
    return { model: CODE_MODEL, reason: "code-or-complex" };
  }

  if (deepReasoningPattern.test(text)) {
    return { model: LONG_CONTEXT_MODEL, reason: "deep-reasoning" };
  }

  return { model: DEFAULT_MODEL, reason: "fast-default" };
}

function toModelMessage(message: IncomingMessage) {
  if (message.role === "user" && message.imageDataUrl) {
    const parts: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    > = [];

    if (message.content.trim()) {
      parts.push({ type: "text", text: message.content });
    }

    parts.push({ type: "image_url", image_url: { url: message.imageDataUrl } });

    return {
      role: message.role,
      content: parts,
    };
  }

  return {
    role: message.role,
    content: message.content,
  };
}

const ALLOWED_MODELS = [
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
  "qwen/qwen3-32b",
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
  "moonshotai/kimi-k2-instruct",
  "moonshotai/kimi-k2-instruct-0905",
  "meta-llama/llama-4-scout-17b-16e-instruct",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = body.messages as IncomingMessage[];
    const requestedModel = body.model as string;
    const requestedTemperature = body.temperature;
    const systemPrompt = body.systemPrompt || "";
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing GROQ_API_KEY" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages must be a non-empty array" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const hasInvalidMessage = messages.some(
      (message) =>
        !message ||
        (message.role !== "user" && message.role !== "assistant") ||
        typeof message.content !== "string" ||
        (message.imageDataUrl !== undefined && typeof message.imageDataUrl !== "string")
    );

    if (hasInvalidMessage) {
      return new Response(
        JSON.stringify({ error: "invalid message format" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    let model = DEFAULT_MODEL;
    let routedReason = "fallback";

    if (requestedModel === AUTO_MODEL) {
      const picked = pickAutoModel(messages);
      model = picked.model;
      routedReason = picked.reason;
    } else if (typeof requestedModel === "string" && ALLOWED_MODELS.includes(requestedModel)) {
      model = requestedModel;
      routedReason = "manual";
    }

    const temperature =
      typeof requestedTemperature === "number" &&
      Number.isFinite(requestedTemperature) &&
      requestedTemperature >= 0 &&
      requestedTemperature <= 1
        ? requestedTemperature
        : 0.7;

    const latestUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === "user");

    let usedToolName = "none";
    let toolContext = "";

    if (latestUserMessage?.content) {
      const toolRun = await runFoodCaloriesToolFromText(latestUserMessage.content);
      if (toolRun) {
        usedToolName = toolRun.toolName;
        toolContext = [
          "你可使用以下工具結果回答使用者問題。",
          `tool_name: ${toolRun.toolName}`,
          `tool_input: ${JSON.stringify(toolRun.query)}`,
          `tool_output: ${JSON.stringify(toolRun.result)}`,
          "如果工具 found=false，請明確告知資料庫沒有精確值，並提供合理估算範圍。",
          "若 query.unit 是 serving，請用『一份』或『約100g』描述，避免只寫『克』或缺少數字。",
          "若 tool_output.source 是 USDA 且有 citation，請在回答最後附上『出處：<title> <url>（accessed: <accessedAt>）』。",
        ].join("\n");
      }
    }

    const mergedSystemPrompt = [systemPrompt, toolContext].filter(Boolean).join("\n\n");

    // 構建最終的messages陣列，如果有system prompt就添加在開頭
    const finalMessages = mergedSystemPrompt
      ? [{ role: "system" as const, content: mergedSystemPrompt }, ...messages]
      : messages;

    const modelMessages = finalMessages.map((message) =>
      toModelMessage(message as IncomingMessage)
    );

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: modelMessages,
          temperature,
          stream: true,
        }),
      }
    );

    if (!response.ok || !response.body) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: errorText || "Groq API request failed" }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Routed-Model": model,
        "X-Routing-Reason": routedReason,
        "X-MCP-Tool": usedToolName,
      },
    });
  } catch (error) {
    console.error("route error:", error);

    return new Response(
      JSON.stringify({ error: "Server error while calling Groq" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}