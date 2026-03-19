"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "@/components/sidebar/Sidebar";
import ChatWindow from "@/components/chat/ChatWindow";
import ChatInput from "@/components/chat/ChatInput";
import { Conversation, Folder } from "@/lib/types";
import {
  loadConversations,
  loadFolders,
  saveConversations,
  saveFolders,
} from "@/lib/storage";
import { loadSettings } from "@/lib/settings";

function createId() {
  return crypto.randomUUID();
}

const AVAILABLE_MODELS = [
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
  "qwen/qwen3-32b",
  "openai/gpt-oss-20b",
  "moonshotai/kimi-k2-instruct",
];

export default function Home() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [accentColor, setAccentColor] = useState("#2563eb");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [temperature, setTemperature] = useState(0.7);

  useEffect(() => {
    const savedFolders = loadFolders();
    const savedConversations = loadConversations();
    const settings = loadSettings();

    setFolders(savedFolders);
    setConversations(savedConversations);
    setAccentColor(settings.accentColor);

    if (savedConversations.length > 0) {
      setActiveConversationId(savedConversations[0].id);
    }

    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    saveFolders(folders);
  }, [folders, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    saveConversations(conversations);
  }, [conversations, isHydrated]);

  useEffect(() => {
    const handleFocus = () => {
      const settings = loadSettings();
      setAccentColor(settings.accentColor);
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeConversationId) || null;
  }, [conversations, activeConversationId]);

  function handleNewChat() {
    const newConversation: Conversation = {
      id: createId(),
      title: "New Chat",
      folderId: null,
      model: "llama-3.1-8b-instant",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setConversations((prev) => [newConversation, ...prev]);
    setActiveConversationId(newConversation.id);
  }

  function handleNewFolder() {
    const name = window.prompt("資料夾名稱？");
    if (!name?.trim()) return;

    const newFolder: Folder = {
      id: createId(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
    };

    setFolders((prev) => [newFolder, ...prev]);
  }

  function handleChangeModel(nextModel: string) {
    if (!activeConversation) return;

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? {
              ...c,
              model: nextModel,
              updatedAt: new Date().toISOString(),
            }
          : c
      )
    );
  }

  function handleMoveToFolder(conversationId: string, folderId: string | null) {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              folderId,
              updatedAt: new Date().toISOString(),
            }
          : c
      )
    );
  }
  function handleDeleteConversation(conversationId: string) {
    const ok = window.confirm("要刪除這個對話嗎？");
    if (!ok) return;

    const remaining = conversations.filter((c) => c.id !== conversationId);
    setConversations(remaining);

    if (activeConversationId === conversationId) {
      setActiveConversationId(remaining.length > 0 ? remaining[0].id : null);
    }
  }


  async function handleSend() {
    if (!input.trim() || loading || !activeConversation) return;

    const userMessage = { role: "user" as const, content: input };
    const updatedMessages = [...activeConversation.messages, userMessage];

    const updatedConversation: Conversation = {
      ...activeConversation,
      title:
        activeConversation.messages.length === 0
          ? input.slice(0, 20)
          : activeConversation.title,
      messages: updatedMessages,
      updatedAt: new Date().toISOString(),
    };

    setConversations((prev) =>
      prev.map((c) => (c.id === activeConversation.id ? updatedConversation : c))
    );

    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages,
          model: activeConversation.model,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error("API request failed");
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

          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const token = parsed?.choices?.[0]?.delta?.content;

            if (token) {
              assistantText += token;

              setConversations((prev) =>
                prev.map((c) =>
                  c.id === activeConversation.id
                    ? {
                        ...c,
                        messages: [
                          ...updatedMessages,
                          { role: "assistant", content: assistantText },
                        ],
                        updatedAt: new Date().toISOString(),
                      }
                    : c
                )
              );
            }
          } catch {}
        }
      }
    } catch {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? {
                ...c,
                messages: [
                  ...updatedMessages,
                  { role: "assistant", content: "出錯了，請稍後再試。" },
                ],
                updatedAt: new Date().toISOString(),
              }
            : c
        )
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        folders={folders}
        conversations={conversations}
        activeConversationId={activeConversationId}
        accentColor={accentColor}
        onNewChat={handleNewChat}
        onNewFolder={handleNewFolder}
        onSelectConversation={setActiveConversationId}
        onMoveToFolder={handleMoveToFolder}
        onDeleteConversation={handleDeleteConversation}
      />

      <main className="flex-1 flex flex-col">
      <div className="p-4 border-b bg-white flex items-center justify-between gap-4">
        <div className="font-semibold min-w-0">
          {activeConversation ? activeConversation.title : "請先建立新對話"}
        </div>

        {activeConversation && (
          <div className="flex items-center gap-4">
            {/* 模型選擇 */}
            <select
              value={activeConversation.model}
              onChange={(e) => handleChangeModel(e.target.value)}
              disabled={loading}
              className="border rounded-lg px-3 py-2 bg-white text-sm"
            >
              {AVAILABLE_MODELS.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>

            {/* 👉 Temperature 控制 */}
            <div className="flex items-center gap-2 text-sm">
              <span>Temp</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
              />
              <span className="w-10 text-right">
                {temperature.toFixed(1)}
              </span>
            </div>
          </div>
        )}
      </div>
        <ChatWindow
          messages={activeConversation?.messages || []}
          loading={loading}
          accentColor={accentColor}
        />

        <ChatInput
          input={input}
          loading={loading}
          accentColor={accentColor}
          inputRef={inputRef}
          onChange={setInput}
          onSend={handleSend}
        />
      </main>
    </div>
  );
}