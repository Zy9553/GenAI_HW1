import { Conversation, Folder } from "./types";

const FOLDERS_KEY = "folders";
const CONVERSATIONS_KEY = "conversations";
const USER_MEMORY_KEY = "user_memory";

export function loadFolders(): Folder[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(FOLDERS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveFolders(folders: Folder[]) {
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
}

export function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(CONVERSATIONS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveConversations(conversations: Conversation[]) {
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
}

export function clearAllConversations() {
  localStorage.removeItem(CONVERSATIONS_KEY);
}

export function clearAllFolders() {
  localStorage.removeItem(FOLDERS_KEY);
}

export function clearUserMemory() {
  localStorage.removeItem(USER_MEMORY_KEY);
}

export function clearAllLocalData() {
  localStorage.removeItem(CONVERSATIONS_KEY);
  localStorage.removeItem(FOLDERS_KEY);
  localStorage.removeItem(USER_MEMORY_KEY);
}