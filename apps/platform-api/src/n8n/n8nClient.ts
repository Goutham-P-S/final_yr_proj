import axios from "axios";

export async function n8nImportWorkflow(params: {
  n8nBaseUrl: string; // example: http://localhost:5685
  username: string;
  password: string;
  workflow: any;
}) {
  const { n8nBaseUrl, username, password, workflow } = params;

  // n8n REST API route
  const url = `${n8nBaseUrl}/rest/workflows`;

  const res = await axios.post(url, workflow, {
    auth: { username, password },
    headers: { "Content-Type": "application/json" },
    timeout: 20000,
  });

  return res.data;
}
