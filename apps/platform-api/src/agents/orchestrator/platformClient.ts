const BASE_URL = "http://localhost:5050";

//
// Types
//

export interface StartupRecord {
  startupId: number;
  slug: string;
  sandboxName: string;
  sandboxPath: string;
  ports: {
    webPort: number;
    dbPort: number;
    n8nPort: number;
    backendPort?: number;
  };
  versions: {
    infra: string;
    planner: string;
    workflowIR: string;
    builder: string;
  };
  createdAt: string;
}

//
// Internal helper
//

async function safeFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, options);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Platform API Error (${res.status}): ${text}`
    );
  }

  return res.json();
}

//
// 1️⃣ Create Startup
//

export async function createStartup(
  name: string,
  slug?: string
): Promise<StartupRecord> {
  return safeFetch<StartupRecord>(`${BASE_URL}/startups`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name,
      slug
    })
  });
}

//
// 2️⃣ Bring Startup Up
//

export async function bringStartupUp(
  sandboxName: string,
  requirement?: string
): Promise<{ ok: boolean; message: string }> {
  return safeFetch(`${BASE_URL}/startups/${sandboxName}/up`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      requirement
    })
  });
}

//
// 3️⃣ Bring Startup Down
//

export async function bringStartupDown(
  sandboxName: string
): Promise<{ ok: boolean; message: string }> {
  return safeFetch(`${BASE_URL}/startups/${sandboxName}/down`, {
    method: "POST"
  });
}

//
// 4️⃣ Get Startup Status
//

export async function getStartupStatus(
  sandboxName: string
) {
  return safeFetch(`${BASE_URL}/startups/${sandboxName}/status`);
}

//
// 5️⃣ List All Startups
//

export async function listStartups(): Promise<StartupRecord[]> {
  return safeFetch(`${BASE_URL}/startups`);
}
