import { Message } from "@/lib/types";
import MessageBubble from "./MessageBubble";

type Props = {
  messages: Message[];
  loading: boolean;
  accentColor: string;
  onBranchFromLast?: () => void;
};

export default function ChatWindow({
  messages,
  loading,
  accentColor,
  onBranchFromLast,
}: Props) {
  const lastIndex = messages.length - 1;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 cyber-panel cyber-panel--glass">
      {messages.map((message, index) => (
        <MessageBubble
          key={index}
          message={message}
          accentColor={accentColor}
          showBranchAction={Boolean(onBranchFromLast) && index === lastIndex}
          onBranch={onBranchFromLast}
        />
      ))}

      {loading && (
        <div className="flex justify-start">
          <div className="neo-card px-4 py-3 rounded-2xl">
            AI 思考中...
          </div>
        </div>
      )}
    </div>
  );
}