export type Message = {
  role: "user" | "assistant";
  content: string;
  imageDataUrl?: string;
};

export type UserMemoryItem = {
  id: string;
  content: string;
  source: "user" | "assistant";
  createdAt: string;
};

export type Conversation = {
  id: string;
  title: string;
  folderId: string | null;
  model: string;
  messages: Message[];
  branches: ConversationBranch[];
  activeBranchId: string | null;
  systemPrompt: string;
  createdAt: string;
  updatedAt: string;
};

export type ConversationBranch = {
  id: string;
  title: string;
  parentMessageIndex: number;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
};

export type Folder = {
  id: string;
  name: string;
  createdAt: string;
};