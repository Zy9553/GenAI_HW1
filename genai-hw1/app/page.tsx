"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "@/components/sidebar/Sidebar";
import ChatWindow from "@/components/chat/ChatWindow";
import ChatInput from "@/components/chat/ChatInput";
import { Conversation, ConversationBranch, Folder } from "@/lib/types";
import {
  loadConversations,
  loadFolders,
  saveConversations,
  saveFolders,
  loadUserMemory,
  saveUserMemory,
} from "@/lib/storage";
import { applyTheme, loadSettings } from "@/lib/settings";
import {
  appendMemoryItem,
  buildMemoryPrompt,
  composeSystemPrompt,
} from "@/lib/llm";

function createId() {
  return crypto.randomUUID();
}

function normalizeConversation(conversation: Conversation): Conversation {
  const branches = Array.isArray(conversation.branches) ? conversation.branches : [];
  const activeBranchId =
    typeof conversation.activeBranchId === "string"
      ? conversation.activeBranchId
      : null;
  const resolvedActiveBranchId = branches.some(
    (branch) => branch.id === activeBranchId
  )
    ? activeBranchId
    : null;

  return {
    ...conversation,
    branches,
    activeBranchId: resolvedActiveBranchId,
  };
}

const AVAILABLE_MODELS = [
  "auto",
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
  const [defaultSystemPrompt, setDefaultSystemPrompt] = useState("");
  const [selectedImageDataUrl, setSelectedImageDataUrl] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState<string | null>(null);
  const [routedModel, setRoutedModel] = useState<string | null>(null);
  const [routingReason, setRoutingReason] = useState<string | null>(null);

  useEffect(() => {
    const savedFolders = loadFolders();
    const savedConversations = loadConversations().map(normalizeConversation);
    const settings = loadSettings();

    setFolders(savedFolders);
    setConversations(savedConversations);
    setAccentColor(settings.accentColor);
    setDefaultSystemPrompt(settings.systemPrompt);
    applyTheme(settings.theme);

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
      setDefaultSystemPrompt(settings.systemPrompt);
      applyTheme(settings.theme);
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  useEffect(() => {
    setRoutedModel(null);
    setRoutingReason(null);
  }, [activeConversationId]);

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeConversationId) || null;
  }, [conversations, activeConversationId]);

  const activeBranch = useMemo(() => {
    if (!activeConversation?.activeBranchId) return null;
    return (
      activeConversation.branches.find(
        (branch) => branch.id === activeConversation.activeBranchId
      ) || null
    );
  }, [activeConversation]);

  const activeMessages = useMemo(() => {
    if (!activeConversation) return [];
    return activeBranch ? activeBranch.messages : activeConversation.messages;
  }, [activeConversation, activeBranch]);

  function updateConversationMessages(
    conversation: Conversation,
    nextMessages: Conversation["messages"],
    nextUpdatedAt: string
  ): Conversation {
    const hasActiveBranch =
      conversation.activeBranchId &&
      conversation.branches.some(
        (branch) => branch.id === conversation.activeBranchId
      );

    if (!hasActiveBranch) {
      return {
        ...conversation,
        messages: nextMessages,
        updatedAt: nextUpdatedAt,
      };
    }

    return {
      ...conversation,
      branches: conversation.branches.map((branch) =>
        branch.id === conversation.activeBranchId
          ? {
              ...branch,
              messages: nextMessages,
              updatedAt: nextUpdatedAt,
            }
          : branch
      ),
      updatedAt: nextUpdatedAt,
    };
  }

  function handleNewChat() {
    const newConversation: Conversation = {
      id: createId(),
      title: "New Chat",
      folderId: null,
      model: "auto",
      messages: [],
      branches: [],
      activeBranchId: null,
      systemPrompt: defaultSystemPrompt,
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

    setRoutedModel(null);
    setRoutingReason(null);

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

  function handleChangeSystemPrompt(nextSystemPrompt: string) {
    if (!activeConversation) return;

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? {
              ...c,
              systemPrompt: nextSystemPrompt,
              updatedAt: new Date().toISOString(),
            }
          : c
      )
    );
  }

  function handleSelectBranch(nextBranchId: string) {
    if (!activeConversation) return;
    const nextUpdatedAt = new Date().toISOString();
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? {
              ...c,
              activeBranchId: nextBranchId === "main" ? null : nextBranchId,
              updatedAt: nextUpdatedAt,
            }
          : c
      )
    );
  }

  function handleCreateBranchFromLast() {
    if (!activeConversation || activeMessages.length === 0 || loading) return;

    const nowIso = new Date().toISOString();
    const nextBranch: ConversationBranch = {
      id: createId(),
      title: `Branch ${activeConversation.branches.length + 1}`,
      parentMessageIndex: Math.max(activeMessages.length - 1, 0),
      messages: [...activeMessages],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? {
              ...c,
              branches: [...c.branches, nextBranch],
              activeBranchId: nextBranch.id,
              updatedAt: nowIso,
            }
          : c
      )
    );
  }

  function handleExportBranches() {
    if (!activeConversation) return;

    const exportPayload = {
      conversationId: activeConversation.id,
      title: activeConversation.title,
      model: activeConversation.model,
      systemPrompt: activeConversation.systemPrompt,
      createdAt: activeConversation.createdAt,
      updatedAt: activeConversation.updatedAt,
      activeBranchId: activeConversation.activeBranchId,
      mainMessages: activeConversation.messages,
      branches: activeConversation.branches,
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `conversation-${activeConversation.id}-branches.json`;
    link.click();
    URL.revokeObjectURL(url);
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

  async function handleImageSelect(file: File) {
    if (!file.type.startsWith("image/")) {
      window.alert("請選擇圖片檔案");
      return;
    }

    const maxSizeBytes = 4 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      window.alert("圖片檔案過大，請選擇 4MB 以下的圖片");
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("read image failed"));
      reader.readAsDataURL(file);
    });

    if (!dataUrl) {
      window.alert("讀取圖片失敗，請再試一次");
      return;
    }

    setSelectedImageDataUrl(dataUrl);
    setSelectedImageName(file.name);
  }

  function handleImageClear() {
    setSelectedImageDataUrl(null);
    setSelectedImageName(null);
  }


  async function handleSend() {
    const trimmedInput = input.trim();
    if ((!trimmedInput && !selectedImageDataUrl) || loading || !activeConversation) return;

    const userMessage = {
      role: "user" as const,
      content: trimmedInput,
      imageDataUrl: selectedImageDataUrl || undefined,
    };
    const updatedMessages = [...activeMessages, userMessage];
    const nowIso = new Date().toISOString();

    const memory = loadUserMemory();
    const nextMemory = appendMemoryItem(memory, {
      id: createId(),
      content: userMessage.content,
      source: "user",
      createdAt: nowIso,
    });
    saveUserMemory(nextMemory);
    const memoryPrompt = buildMemoryPrompt(nextMemory);
    const finalSystemPrompt = composeSystemPrompt(
      activeConversation.systemPrompt,
      memoryPrompt
    );

    const updatedConversation: Conversation = updateConversationMessages(
      {
        ...activeConversation,
        title:
          activeMessages.length === 0
            ? (trimmedInput || "圖片訊息").slice(0, 20)
            : activeConversation.title,
      },
      updatedMessages,
      nowIso
    );

    setConversations((prev) =>
      prev.map((c) => (c.id === activeConversation.id ? updatedConversation : c))
    );

    setInput("");
    setSelectedImageDataUrl(null);
    setSelectedImageName(null);
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
          temperature,
          systemPrompt: finalSystemPrompt,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error("API request failed");
      }

      setRoutedModel(res.headers.get("x-routed-model"));
      setRoutingReason(res.headers.get("x-routing-reason"));

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
                    ? updateConversationMessages(
                        c,
                        [
                          ...updatedMessages,
                          { role: "assistant", content: assistantText },
                        ],
                        new Date().toISOString()
                      )
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
            ? updateConversationMessages(
                c,
                [
                  ...updatedMessages,
                  { role: "assistant", content: "出錯了，請稍後再試。" },
                ],
                new Date().toISOString()
              )
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
      <div className="p-4 flex flex-wrap items-center justify-between gap-4 cyber-topbar">
        <div className="font-semibold min-w-0 text-[color:var(--text-strong)] tracking-[0.04em]">
          {activeConversation ? activeConversation.title : "請先建立新對話"}
        </div>

        {activeConversation && (
          <div className="flex items-center gap-4">
            {/* 模型選擇 */}
            <select
              value={activeConversation.model}
              onChange={(e) => handleChangeModel(e.target.value)}
              disabled={loading}
              className="rounded-lg px-3 py-2 text-sm neo-select"
            >
              {AVAILABLE_MODELS.map((model) => (
                <option key={model} value={model}>
                  {model === "auto" ? "auto (smart routing)" : model}
                </option>
              ))}
            </select>

            {activeConversation.branches.length > 0 && (
              <select
                value={activeConversation.activeBranchId || "main"}
                onChange={(e) => handleSelectBranch(e.target.value)}
                disabled={loading}
                className="rounded-lg px-3 py-2 text-sm neo-select"
              >
                <option value="main">Main</option>
                {activeConversation.branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.title}
                  </option>
                ))}
              </select>
            )}

            {activeConversation.model === "auto" && (
              <div className="text-xs min-w-0 max-w-52 truncate cyber-kicker" title={routedModel || "尚未路由"}>
                Route: {routedModel || "pending"}
                {routingReason ? ` (${routingReason})` : ""}
              </div>
            )}

            {/* 👉 Temperature 控制 */}
            <div className="flex items-center gap-2 text-sm text-[color:var(--text-subtle)]">
              <span className="cyber-kicker">Temp</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="neo-range"
              />
              <span className="w-10 text-right">
                {temperature.toFixed(1)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleExportBranches}
              className="rounded-lg px-3 py-2 text-sm neo-button neo-button--ghost"
            >
              匯出對話備份（JSON）
            </button>

          </div>
        )}
      </div>
        <ChatWindow
          messages={activeMessages}
          loading={loading}
          accentColor={accentColor}
          onBranchFromLast={handleCreateBranchFromLast}
        />

        <ChatInput
          input={input}
          loading={loading}
          accentColor={accentColor}
          imagePreviewUrl={selectedImageDataUrl}
          imageName={selectedImageName}
          inputRef={inputRef}
          onChange={setInput}
          onImageSelect={handleImageSelect}
          onImageClear={handleImageClear}
          onSend={handleSend}
        />

      </main>
    </div>
  );
}