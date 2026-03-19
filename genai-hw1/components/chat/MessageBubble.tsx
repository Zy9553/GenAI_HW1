import { Message } from "@/lib/types";

type Props = {
  message: Message;
  accentColor: string;
};

export default function MessageBubble({ message, accentColor }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[70%] px-4 py-3 rounded-2xl whitespace-pre-wrap"
        style={
          isUser
            ? {
                backgroundColor: accentColor,
                color: "white",
              }
            : {
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                color: "#111827",
              }
        }
      >
        {message.content}
      </div>
    </div>
  );
}