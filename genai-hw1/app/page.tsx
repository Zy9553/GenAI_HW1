"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState("llama-3.1-8b-instant");

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: input },
    ];

    setInput("");
    setLoading(true);

    setMessages([
      ...newMessages,
      { role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: newMessages,
          model,
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "API request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.replace("data: ", "").trim();

          if (jsonStr === "[DONE]") {
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const token = parsed?.choices?.[0]?.delta?.content;

            if (token) {
              assistantText += token;

              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: assistantText,
                };
                return updated;
              });
            }
          } catch {
            // 忽略非完整 JSON chunk
          }
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "出錯了，請稍後再試。";

      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: `錯誤：${errorMessage}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    setMessages([]);
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="p-4 border-b bg-white flex justify-between items-center gap-4">
        <h1 className="text-xl font-bold">My LLM Chat</h1>

        <div className="flex items-center gap-3">
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="border rounded px-3 py-2 bg-white"
          disabled={loading}
        >
          <option value="llama-3.1-8b-instant">
            llama-3.1-8b-instant（快速）
          </option>
          <option value="llama-3.3-70b-versatile">
            llama-3.3-70b-versatile（高品質）
          </option>
          <option value="qwen/qwen3-32b">
            qwen/qwen3-32b（中文/平衡）
          </option>
          <option value="openai/gpt-oss-20b">
            openai/gpt-oss-20b（平衡）
          </option>
          <option value="openai/gpt-oss-120b">
            openai/gpt-oss-120b（大型）
          </option>
          <option value="moonshotai/kimi-k2-instruct">
            moonshotai/kimi-k2-instruct（中文長文）
          </option>
          <option value="moonshotai/kimi-k2-instruct-0905">
            moonshotai/kimi-k2-instruct-0905（新版）
          </option>
          <option value="meta-llama/llama-4-scout-17b-16e-instruct">
            llama-4-scout-17b-16e-instruct（實驗）
          </option>
        </select>

          <button
            onClick={clearChat}
            className="text-sm border px-3 py-2 rounded hover:bg-gray-100"
          >
            清除
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => {
          const isUser = m.role === "user";

          return (
            <div
              key={i}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] px-4 py-3 rounded-2xl whitespace-pre-wrap ${
                  isUser ? "bg-blue-600 text-white" : "bg-white border"
                }`}
              >
                {m.content}
              </div>
            </div>
          );
        })}

        {loading && messages[messages.length - 1]?.content === "" && (
          <div className="flex justify-start">
            <div className="bg-white border px-4 py-3 rounded-2xl">
              AI 思考中...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            className="flex-1 border rounded-xl p-3 resize-none"
            rows={2}
            placeholder="輸入訊息..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />

          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-black text-white px-4 py-2 rounded-xl disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}