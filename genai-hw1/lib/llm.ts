import { UserMemoryItem } from "./types";

const MAX_MEMORY_ITEMS = 50;
const MAX_MEMORY_CHARS = 2000;

function normalizeMemoryText(text: string) {
	return text.replace(/\s+/g, " ").trim();
}

export function appendMemoryItem(
	memory: UserMemoryItem[],
	item: UserMemoryItem
): UserMemoryItem[] {
	const normalized = normalizeMemoryText(item.content);
	if (!normalized) return pruneMemory(memory);

	const next = [{ ...item, content: normalized }, ...memory];
	return pruneMemory(next);
}

export function pruneMemory(memory: UserMemoryItem[]): UserMemoryItem[] {
	const seen = new Set<string>();
	const deduped: UserMemoryItem[] = [];

	for (const item of memory) {
		const normalized = normalizeMemoryText(item.content);
		if (!normalized || seen.has(normalized)) continue;
		seen.add(normalized);
		deduped.push({ ...item, content: normalized });
	}

	return deduped.slice(0, MAX_MEMORY_ITEMS);
}

export function buildMemoryPrompt(memory: UserMemoryItem[]): string {
	const cleaned = pruneMemory(memory);
	if (cleaned.length === 0) return "";

	let total = 0;
	const lines: string[] = [];

	for (const item of cleaned) {
		const line = `- ${item.content}`;
		if (total + line.length > MAX_MEMORY_CHARS) break;
		lines.push(line);
		total += line.length;
	}

	if (lines.length === 0) return "";

	return [
		"以下是使用者的長期記憶（僅作為背景，不要主動提及）：",
		...lines,
	].join("\n");
}

export function composeSystemPrompt(
	basePrompt: string,
	memoryPrompt: string
): string {
	return [memoryPrompt, basePrompt].filter(Boolean).join("\n\n");
}
