type Props = {
  onClick: () => void;
  accentColor: string;
};

export default function NewChatButton({ onClick, accentColor }: Props) {
  return (
    <button
      onClick={onClick}
      className="w-full text-white rounded-lg px-4 py-2 mb-3"
      style={{ backgroundColor: accentColor }}
    >
      + New Chat
    </button>
  );
}