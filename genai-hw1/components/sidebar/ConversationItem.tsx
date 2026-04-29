"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Conversation, Folder } from "@/lib/types";

type Props = {
  conversation: Conversation;
  folders: Folder[];
  active: boolean;
  accentColor: string;
  onClick: () => void;
  onMoveToFolder: (conversationId: string, folderId: string | null) => void;
  onDeleteConversation: (conversationId: string) => void;
};

export default function ConversationItem({
  conversation,
  folders,
  active,
  accentColor,
  onClick,
  onMoveToFolder,
  onDeleteConversation,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <div
      className={`group relative w-full rounded-lg neo-item ${active ? "neo-item--active" : ""}`}
      style={
        active ? ({ "--accent": accentColor } as CSSProperties) : undefined
      }
    >
      <button
        onClick={onClick}
        className="w-full text-left px-3 py-2 pr-10 rounded-lg text-sm"
      >
        <div className="truncate">{conversation.title}</div>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((prev) => !prev);
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded opacity-0 group-hover:opacity-100 neo-icon-button"
      >
        ...
      </button>

      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute right-2 top-10 z-20 w-52 rounded-xl neo-card p-2"
        >
          <div className="px-2 py-1 text-xs text-[color:var(--text-muted)]">Move to folder</div>

          <button
            onClick={() => {
              onMoveToFolder(conversation.id, null);
              setMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-sm rounded hover:bg-[var(--surface-strong)]"
          >
            Ungrouped
          </button>

          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => {
                onMoveToFolder(conversation.id, folder.id);
                setMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm rounded hover:bg-[var(--surface-strong)]"
            >
              {folder.name}
            </button>
          ))}

          <div className="my-2 border-t border-[color:var(--border)]" />

          <button
            onClick={() => {
              onDeleteConversation(conversation.id);
              setMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-sm rounded text-[color:var(--neon-magenta)] hover:bg-[var(--danger-muted)]"
          >
            Delete conversation
          </button>
        </div>
      )}
    </div>
  );
}