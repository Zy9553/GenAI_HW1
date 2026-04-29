# GenAI HW1 - LLM Chat UI (Groq + USDA MCP Tool)

This project is a custom LLM chat interface with streaming responses, image input, auto model routing, and a food-calorie MCP tool powered by USDA FoodData Central.

## Features

- Real-time streaming chat
- Multi-model selection + temperature control
- Auto model routing based on task type
- Image input (with preview) in chat
- Conversation/folder management in localStorage
- Editable per-conversation system prompt
- Food calorie query MCP tool using USDA API

## Environment Variables

Create or edit [genai-hw1/.env.local](genai-hw1/.env.local):

```env
GROQ_API_KEY=your_groq_api_key
USDA_API_KEY=your_usda_api_key
```

## Run

```bash
cd genai-hw1
npm install
npm run dev
```

Open http://localhost:3000

## MCP Endpoint

- POST /api/mcp/food-calories
- GET /api/mcp/food-calories?text=100g%20rice%20calories

For detailed usage and examples, see [genai-hw1/README.md](genai-hw1/README.md).
