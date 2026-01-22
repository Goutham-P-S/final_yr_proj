import axios from "axios";

export async function n8nImportWorkflow(params: {
  n8nBaseUrl: string; // http://localhost:5694
  apiKey: string; // dev-api-key-123
  workflow: any;
}) {
  const { n8nBaseUrl, apiKey, workflow } = params;

  const url = `${n8nBaseUrl}/api/v1/workflows`;

  const payload = {
    name: workflow.name ?? "Startup Template",
    nodes: workflow.nodes ?? [],
    connections: workflow.connections ?? {},
    settings: workflow.settings ?? {},
    active: workflow.active ?? false,
  };

  const res = await axios.post(url, payload, {
    headers: {
      "X-N8N-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    timeout: 20000,
  });

  return res.data;
}
