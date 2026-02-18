export async function llamaChat(options: {
  system: string;
  user: string;
  temperature?: number;
}) {
  const res = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3.1",
      messages: [
        { role: "system", content: options.system },
        { role: "user", content: options.user }
      ],
      temperature: options.temperature ?? 0.2,
      stream: false
    })
  });

  if (!res.ok) {
    throw new Error("LLaMA call failed");
  }

  const data = await res.json();
  return data.message.content;
}
