import axios from "axios";

export async function n8nImportWorkflow(params: {
  n8nBaseUrl: string;
  apiKey: string;
  workflow: any;
}) {
  const { n8nBaseUrl, apiKey, workflow } = params;

  const url = `${n8nBaseUrl}/rest/workflows`;

  const res = await axios.post(url, workflow, {
    headers: {
      "Content-Type": "application/json",
      "X-N8N-API-KEY": apiKey,
    },
    timeout: 20000,
  });

  return res.data;
}
