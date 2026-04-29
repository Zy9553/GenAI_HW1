import { Conversation, Folder } from "@/lib/types";
import ConversationItem from "./ConversationItem";

type Props = {
  folder: Folder;
  folders: Folder[];
  conversations: Conversation[];
  activeConversationId: string | null;
  accentColor: string;
  onSelectConversation: (id: string) => void;
  onMoveToFolder: (conversationId: string, folderId: string | null) => void;
  onDeleteConversation: (conversationId: string) => void;
};

export default function FolderItem({
  folder,
  folders,
  conversations,
  activeConversationId,
  accentColor,
  onSelectConversation,
  onMoveToFolder,
  onDeleteConversation,
}: Props) {
  return (
    <div className="mb-4">
      <div className="cyber-kicker mb-2">📁 {folder.name}</div>
      <div className="space-y-1 pl-2">
        {conversations.map((conversation) => (
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
  );
}