import { RefObject } from "react";

type Props = {
  input: string;
  loading: boolean;
  accentColor: string;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
  onSend: () => void;
};

export default function ChatInput({
  input,
  loading,
  accentColor,
  inputRef,
  onChange,
  onSend,
}: Props) {
  return (
    <div className="p-4 border-t bg-white">
      <div className="flex gap-2">
        <textarea
          ref={inputRef}
          className="flex-1 border rounded-xl p-3 resize-none"
          rows={2}
          placeholder="輸入訊息..."
          value={input}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
        />

        <button
          type="button"
          onClick={onSend}
          disabled={loading || !input.trim()}
          className="text-white px-4 py-2 rounded-xl disabled:opacity-50"
          style={{ backgroundColor: accentColor }}
        >
          Send
        </button>
      </div>
    </div>
  );
}