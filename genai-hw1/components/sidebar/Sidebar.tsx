import Link from "next/link";
import { Conversation, Folder } from "@/lib/types";
import FolderItem from "./FolderItem";
import ConversationItem from "./ConversationItem";
import NewChatButton from "./NewChatButton";

type Props = {
  folders: Folder[];
  conversations: Conversation[];
  activeConversationId: string | null;
  accentColor: string;
  onNewChat: () => void;
  onNewFolder: () => void;
  onSelectConversation: (id: string) => void;
  onMoveToFolder: (conversationId: string, folderId: string | null) => void;
  onDeleteConversation: (conversationId: string) => void;
};

export default function Sidebar({
  folders,
  conversations,
  activeConversationId,
  accentColor,
  onNewChat,
  onNewFolder,
  onSelectConversation,
  onMoveToFolder,
  onDeleteConversation,
}: Props) {
  const ungrouped = conversations.filter((c) => c.folderId === null);

  return (
    <aside className="w-72 p-4 overflow-y-auto flex flex-col cyber-sidebar">
      <div className="flex-1">
        <NewChatButton onClick={onNewChat} accentColor={accentColor} />

        <button
          onClick={onNewFolder}
          className="w-full rounded-lg px-4 py-2 mb-4 neo-button neo-button--ghost"
        >
          + New Folder
        </button>

        <div className="space-y-4">
          {folders.map((folder) => {
            const folderConversations = conversations.filter(
              (c) => c.folderId === folder.id
            );

            return (
              <FolderItem
                key={folder.id}
                folder={folder}
                folders={folders}
                conversations={folderConversations}
                activeConversationId={activeConversationId}
                accentColor={accentColor}
                onSelectConversation={onSelectConversation}
                onMoveToFolder={onMoveToFolder}
                onDeleteConversation={onDeleteConversation}
              />
            );
          })}

          {ungrouped.length > 0 && (
            <div>
              <div className="cyber-kicker mb-2">Ungrouped</div>
              <div className="space-y-1">
                {ungrouped.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    folders={folders}
                    active={conversation.id === activeConversationId}
                    accentColor={accentColor}
                    onClick={() => onSelectConversation(conversation.id)}
                    onMoveToFolder={onMoveToFolder}
                    onDeleteConversation={onDeleteConversation}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-[color:var(--border)] pt-4 mt-4">
        <Link
          href="/settings"
          className="block w-full text-left rounded-lg px-3 py-2 text-sm neo-button neo-button--ghost"
        >
          Settings
        </Link>
      </div>
    </aside>
  );
}