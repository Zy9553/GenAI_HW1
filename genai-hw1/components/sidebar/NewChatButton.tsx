import type { CSSProperties } from "react";

type Props = {
  onClick: () => void;
  accentColor: string;
};

export default function NewChatButton({ onClick, accentColor }: Props) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg px-4 py-2 mb-3 neo-button neo-button--accent"
      style={{ "--accent": accentColor } as CSSProperties}
    >
      + New Chat
    </button>
  );
}