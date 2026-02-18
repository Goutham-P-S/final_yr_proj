import { llamaChat } from "../llamaClient";

export async function extractStartupName(prompt: string) {
  const system = `
You are a startup naming assistant.
Extract a short, clean startup name (2-4 words max).
No punctuation.
No explanation.
Return only the name.
`;

  const response = await llamaChat({
    system,
    user: prompt,
    temperature: 0
  });

  return response.trim();
}
