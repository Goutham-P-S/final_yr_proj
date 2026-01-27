import axios from "axios";

export async function n8nImportWorkflowPublicApi(params: {
  n8nBaseUrl: string;
  apiKey: string;
  workflow: any;
}) {
  const { n8nBaseUrl, apiKey, workflow } = params;

  const res = await axios.post(
    `${n8nBaseUrl}/api/v1/workflows`,
    {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings,
      active: workflow.active ?? false,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  return res.data;
}

