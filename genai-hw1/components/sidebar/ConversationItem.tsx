"use client";

import { useEffect, useRef, useState } from "react";
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
      className="group relative w-full rounded-lg"
      style={{
        backgroundColor: active ? `${accentColor}22` : undefined,
      }}
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
        className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-300 transition"
      >
        ...
      </button>

      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute right-2 top-10 z-20 w-52 rounded-xl border bg-white shadow-lg p-2"
        >
          <div className="px-2 py-1 text-xs text-gray-500">Move to folder</div>

          <button
            onClick={() => {
              onMoveToFolder(conversation.id, null);
              setMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100"
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
              className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100"
            >
              {folder.name}
            </button>
          ))}

          <div className="my-2 border-t" />

          <button
            onClick={() => {
              onDeleteConversation(conversation.id);
              setMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-sm rounded text-red-600 hover:bg-red-50"
          >
            Delete conversation
          </button>
        </div>
      )}
    </div>
  );
}