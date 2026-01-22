import axios from "axios";

export async function waitForN8nReady(params: {
  n8nBaseUrl: string;
  username: string;
  password: string;
  timeoutMs?: number;
}) {
  const { n8nBaseUrl, username, password, timeoutMs = 90000 } = params;

  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const res = await axios.get(`${n8nBaseUrl}/healthz`, {
        auth: { username, password },
        timeout: 5000,
      });

      if (res.status === 200) return true;
    } catch {}

    await new Promise((r) => setTimeout(r, 2000));
  }

  throw new Error(`n8n did not become ready within ${timeoutMs}ms`);
}
