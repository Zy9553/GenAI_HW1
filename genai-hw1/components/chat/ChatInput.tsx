import { RefObject, useRef, type CSSProperties } from "react";
import Image from "next/image";

type Props = {
  input: string;
  loading: boolean;
  accentColor: string;
  imagePreviewUrl: string | null;
  imageName: string | null;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
  onImageSelect: (file: File) => void;
  onImageClear: () => void;
  onSend: () => void;
};

export default function ChatInput({
  input,
  loading,
  accentColor,
  imagePreviewUrl,
  imageName,
  inputRef,
  onChange,
  onImageSelect,
  onImageClear,
  onSend,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="p-4 border-t border-[color:var(--border)] cyber-panel cyber-panel--glass">
      {imagePreviewUrl && (
        <div className="mb-3 inline-flex items-center gap-3 rounded-xl neo-card p-2">
          <Image
            src={imagePreviewUrl}
            alt={imageName || "selected image"}
            width={64}
            height={64}
            className="h-16 w-16 rounded-lg object-cover border border-[color:var(--border)]"
          />
          <div className="min-w-0">
            <p className="text-sm text-[color:var(--text-strong)] truncate max-w-56">
              {imageName || "已選擇圖片"}
            </p>
            <button
              type="button"
              onClick={onImageClear}
              className="text-xs neon-link hover:underline"
            >
              移除
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            onImageSelect(file);
            e.currentTarget.value = "";
          }}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="rounded-xl px-3 py-2 neo-button neo-button--ghost"
        >
          圖片
        </button>

        <textarea
          ref={inputRef}
          className="flex-1 rounded-xl p-3 neo-textarea text-[color:var(--foreground)] placeholder:text-[color:var(--text-muted)]"
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
          disabled={loading || (!input.trim() && !imagePreviewUrl)}
          className="px-4 py-2 rounded-xl neo-button neo-button--accent"
          style={{ "--accent": accentColor } as CSSProperties}
        >
          Send
        </button>
      </div>
    </div>
  );
}