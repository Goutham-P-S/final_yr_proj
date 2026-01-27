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
      parameters: n.parameters ?? {},
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

  console.log("📦 Sending workflow payload:", JSON.stringify(payload, null, 2));

  const res = await axios.post(
    `${n8nBaseUrl}/api/v1/workflows`,
    payload,
    {
      headers: {
        "X-N8N-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      timeout: 30000,
      validateStatus: () => true,
    }
  );

  if (res.status >= 400) {
    throw new Error(
      `n8n public API import failed ${res.status}: ${JSON.stringify(res.data)}`
    );
  }

 const workflowId = res.data.id;

  // 2️⃣ Activate workflow
  await axios.post(
    `${n8nBaseUrl}/api/v1/workflows/${workflowId}/activate`,
    {},
    {
      headers: {
        "X-N8N-API-KEY": apiKey,
      },
    }
  );

  return { workflowId };
}
