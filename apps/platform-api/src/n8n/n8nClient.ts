import axios from "axios";

export async function n8nLogin(params: {
  n8nBaseUrl: string;
  email: string;
  password: string;
  basicAuthUser?: string;
  basicAuthPass?: string;
}) {
  const { n8nBaseUrl, email, password, basicAuthUser, basicAuthPass } = params;

  const res = await axios.post(
    `${n8nBaseUrl}/rest/login`,
    { email, password },
    {
      timeout: 20000,
      validateStatus: () => true,
      auth:
        basicAuthUser && basicAuthPass
          ? { username: basicAuthUser, password: basicAuthPass }
          : undefined,
    }
  );

  if (res.status !== 200) {
    throw new Error(
      `n8n login failed: status=${res.status}, body=${JSON.stringify(res.data)}`
    );
  }

  const cookies = res.headers["set-cookie"];
  if (!cookies?.length) throw new Error("n8n login failed: no cookies");

  return cookies.map((c) => c.split(";")[0]).join("; ");
}

function sanitizeWorkflowForPublicApi(workflow: any) {
  return {
    name: workflow.name ?? "Startup Template",
    nodes: workflow.nodes.map((n: any) => ({
      id: n.id,
      name: n.name,
      type: n.type,
      typeVersion: n.typeVersion,
      position: n.position,
      parameters: n.parameters ??  {
  ...n.parameters,
  ...(n.type === "n8n-nodes-base.code"
    ? { code: n.parameters.code }
    : {}),
},

      credentials: n.credentials
        ? Object.fromEntries(
            Object.entries(n.credentials).map(([key, val]: any) => [
              key,
              { name: val.name }, // ❗ name only, NO id
            ])
          )
        : undefined,
    })),
    
    connections: workflow.connections ?? {},
    settings: workflow.settings ?? {},
  };
}

export async function n8nImportWorkflowPublic(params: {
  n8nBaseUrl: string;
  apiKey: string;
  workflow: any;
}) {
  const { n8nBaseUrl, apiKey, workflow } = params;

  const payload = sanitizeWorkflowForPublicApi(workflow);

  const headers = {
    "X-N8N-API-KEY": apiKey,
    "Content-Type": "application/json",
  };

  // 1️⃣ Get all workflows
  const listRes = await axios.get(`${n8nBaseUrl}/api/v1/workflows`, {
    headers,
  });

  const existing = listRes.data.data.find(
    (w: any) => w.name === workflow.name
  );

  // ❗ HARD DELETE (critical fix)
  if (existing) {
    console.log("🧹 Deleting old workflow:", existing.id);

    await axios.delete(
      `${n8nBaseUrl}/api/v1/workflows/${existing.id}`,
      { headers }
    );
  }

  // 2️⃣ Always create fresh
  console.log("🆕 Creating fresh workflow");

  const createRes = await axios.post(
    `${n8nBaseUrl}/api/v1/workflows`,
    payload,
    { headers }
  );

  const workflowId = createRes.data.id;

  // 3️⃣ Activate
  await axios.post(
    `${n8nBaseUrl}/api/v1/workflows/${workflowId}/activate`,
    {},
    { headers }
  );

  return { workflowId };
}
