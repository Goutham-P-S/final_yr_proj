"use client";

import { useEffect, useState } from "react";

type Feedback = {
  id: string;
  message: string;
  page: string | null;
  createdAt: string;
};

export default function FeedbackPage() {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string>("");
  const [items, setItems] = useState<Feedback[]>([]);

  async function load() {
    const res = await fetch("/api/feedback");
    const data = await res.json();
    setItems(data.feedback || []);
  }

  async function submit() {
    setStatus("Submitting...");
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, page: "/feedback" }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setStatus("Error: " + (data?.error || "unknown"));
      return;
    }

    setMessage("");
    setStatus("Saved.");
    await load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <h1>Feedback</h1>

      <div style={{ marginTop: 12 }}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type feedback..."
          style={{ width: "100%", height: 110 }}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={submit} style={{ padding: "10px 14px" }}>
          Submit
        </button>
        <span style={{ marginLeft: 12 }}>{status}</span>
      </div>

      <h2 style={{ marginTop: 24 }}>Latest</h2>
      <div style={{ display: "grid", gap: 10 }}>
        {items.map((f) => (
          <div
            key={f.id}
            style={{
              border: "1px solid #333",
              borderRadius: 10,
              padding: 12,
            }}
          >
            <div style={{ fontSize: 14, opacity: 0.8 }}>
              {new Date(f.createdAt).toLocaleString()} {f.page ? ` • ${f.page}` : ""}
            </div>
            <div style={{ marginTop: 6 }}>{f.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
