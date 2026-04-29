import { Message } from "@/lib/types";
import Image from "next/image";
import type { CSSProperties } from "react";

type Props = {
  message: Message;
  accentColor: string;
  showBranchAction?: boolean;
  onBranch?: () => void;
};

export default function MessageBubble({
  message,
  accentColor,
  showBranchAction,
  onBranch,
}: Props) {
  const isUser = message.role === "user";
  const bubbleStyle = { "--accent": accentColor } as CSSProperties;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[70%]">
        <div
          className={`px-4 py-3 rounded-2xl whitespace-pre-wrap message-bubble ${
            isUser ? "message-bubble--user" : "message-bubble--assistant"
          }`}
          style={
            isUser
              ? {
                  ...bubbleStyle,
                  backgroundColor: accentColor,
                  color: "white",
                }
              : bubbleStyle
          }
        >
          {message.imageDataUrl && (
            <Image
              src={message.imageDataUrl}
              alt="uploaded"
              width={768}
              height={512}
              className="mb-2 max-h-72 w-full rounded-xl object-contain bg-black/10"
              unoptimized
            />
          )}
          {message.content}
        </div>

        {showBranchAction && onBranch && (
          <div className={`mt-2 flex ${isUser ? "justify-end" : "justify-start"}`}>
            <button
              type="button"
              onClick={onBranch}
              className="text-xs rounded-lg px-2 py-1 neo-button neo-button--ghost"
            >
              分支
            </button>
          </div>
        )}
      </div>
    </div>
  );
}