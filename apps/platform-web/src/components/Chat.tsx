import { useEffect, useState } from "react";
import { startOrchestration } from "../api";
import MessageBubble from "./MessageBubble";
import { cancelJob } from "../api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);

  const addMessage = (msg: Message) => {
    setMessages((prev) => [...prev, msg]);
  };

  const handleSend = async () => {
    if (!prompt.trim()) return;

    addMessage({ role: "user", content: prompt });

    const currentPrompt = prompt;
    setPrompt("");

    const id = await startOrchestration(currentPrompt);
    setJobId(id);

    addMessage({
      role: "assistant",
      content: "🚀 Starting deployment..."
    });
  };
  
  useEffect(() => {
  if (!jobId) return;

  const ws = new WebSocket("ws://localhost:5050");

  ws.onopen = () => {
    ws.send(JSON.stringify({
      type: "subscribe",
      jobId
    }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "log") {
      addMessage({
        role: "assistant",
        content: data.message
      });
    }

    if (data.status === "completed") {
      addMessage({
        role: "assistant",
        content: `🎉 Deployment complete!\n\n🌐 ${data.result.webUrl}`
      });
    }

    if (data.status === "failed") {
      addMessage({
        role: "assistant",
        content: `❌ Deployment failed: ${data.error}`
      });
    }

    if (data.status === "cancelled") {
      addMessage({
        role: "assistant",
        content: "⛔ Deployment cancelled."
      });
    }
  };

  return () => ws.close();
}, [jobId]);


  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "90vh",
        maxWidth: 800,
        margin: "auto"
      }}
    >
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 20,
          background: "#0f172a"
        }}
      >
        {messages.map((msg, index) => (
          <MessageBubble
            key={index}
            role={msg.role}
            content={msg.content}
          />
        ))}
      </div>

      <div
        style={{
          padding: 10,
          display: "flex",
          gap: 10,
          background: "#1e293b"
        }}
      >
        <input
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 8,
            border: "none"
          }}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your startup idea..."
        />
        <button onClick={handleSend}>Send</button>
        {jobId && (
  <button
    onClick={() => cancelJob(jobId)}
    style={{
      marginTop: 10,
      background: "red",
      color: "white"
    }}
  >
    Cancel Deployment
  </button>
)}

      </div>
    </div>
  );
}
