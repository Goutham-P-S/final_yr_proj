interface Props {
  role: "user" | "assistant";
  content: string;
}

export default function MessageBubble({ role, content }: Props) {
  const isUser = role === "user";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 10
      }}
    >
      <div
        style={{
          maxWidth: "70%",
          padding: "10px 14px",
          borderRadius: 16,
          background: isUser ? "#2563eb" : "#1f2937",
          color: "white",
          fontSize: 14
        }}
      >
        {content}
      </div>
    </div>
  );
}
