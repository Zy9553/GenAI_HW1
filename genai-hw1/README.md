# GenAI HW1 - LLM Chat UI (Groq + USDA MCP Tool)

這是一個以 Next.js 建立的 LLM 聊天介面，支援 Groq 模型串流回覆、多對話管理、圖片輸入、Auto Model Routing，以及食物熱量查詢 MCP Tool（USDA 資料來源）。
## Features

- ChatGPT-like 即時串流聊天
- 多模型切換與溫度控制
- Auto Model Routing（依任務內容自動選模型）
- 圖片輸入與預覽（可搭配文字）
- 對話與資料夾管理（localStorage）
- 可編輯每個對話的 System Prompt
- 食物熱量查詢 MCP Tool（來源：USDA FoodData Central）

## Environment Variables

在專案根目錄建立或編輯 `.env.local`：
```env
GROQ_API_KEY=your_groq_api_key
USDA_API_KEY=your_usda_api_key
```

- `GROQ_API_KEY`：用於 LLM 對話
- `USDA_API_KEY`：用於食物熱量查詢工具

## Getting Started
```bash
npm install
npm run dev
```

啟動後開啟：

```text
http://localhost:3000
```
## MCP Tool: Food Calories (USDA)

已內建 `get_food_calories` 工具，會在聊天中偵測熱量問題並自動查詢 USDA。

### 1) 在聊天中直接問

例如：

- `100g 雞胸肉熱量多少？`
- `一杯牛奶有多少卡路里？`

### 2) 直接呼叫 API

- `POST /api/mcp/food-calories`
	- Body 範例（text）

```json
{
	"text": "100g chicken breast calories"
}
```

	- Body 範例（structured）

```json
{
	"food": "banana",
	"amount": 1,
	"unit": "piece"
}
```

- `GET /api/mcp/food-calories?text=100g%20rice%20calories`

## Auto Model Routing

模型選擇器提供 `auto (smart routing)`，後端會依輸入內容自動路由：

- 圖片任務 -> vision model
- 程式/複雜任務 -> 較強推理模型
- 長上下文任務 -> 長上下文模型
- 一般問題 -> 快速預設模型

## Tech Stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS
- Groq API (OpenAI-compatible)
- USDA FoodData Central API
- Local storage for conversation persistence

## Notes

- 若熱量查詢回傳找不到，多半是 USDA 查無對應食材或缺少可用 kcal 欄位。
- 若顯示缺少 `USDA_API_KEY`，請確認 `.env.local` 已設定並重新啟動開發伺服器。
