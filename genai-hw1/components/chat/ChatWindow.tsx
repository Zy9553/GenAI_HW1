import { Message } from "@/lib/types";
import MessageBubble from "./MessageBubble";

type Props = {
  messages: Message[];
  loading: boolean;
  accentColor: string;
};

export default function ChatWindow({
  messages,
  loading,
  accentColor,
}: Props) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
      {messages.map((message, index) => (
        <MessageBubble
          key={index}
          message={message}
          accentColor={accentColor}
        />
      ))}

      {loading && (
        <div className="flex justify-start">
          <div className="bg-white border px-4 py-3 rounded-2xl">
            AI 思考中...
          </div>
        </div>
      )}
    </div>
  );
}