import express from "express";
import cors from "cors";
import path from "path";

import { allocatePorts } from "./portAllocator";
import { createSandboxFolder, slugify } from "./sandboxManager";
import { StartupCreateRequest } from "./types";

import { addStartup, listStartups, findStartupBySandboxName } from "./startupStore";
import { dockerComposeUp, dockerComposeDown, dockerComposePs } from "./dockerRunner";
import { buildStartupWorkflowTemplate } from "./n8n/workflowTemplate";
import { devResetAll } from "./devReset";
import "dotenv/config";
import { setupN8nOwner } from "./n8n/setupN8n";
import { waitForN8nReady } from "./n8n/waitForN8n";
import { n8nImportWorkflowPublicApi } from "./n8n/publicApiClient";
import { n8nImportWorkflowPublic } from "./n8n/n8nClient";
import { createN8nApiKey } from "./n8n/createN8nApiKey";



const app = express();
app.use(cors());
app.use(express.json());
app.post("/dev/reset-all", (req, res) => {
  // Layer 1: feature flag
  if (process.env.ALLOW_DEV_RESET !== "true") {
    return res.status(403).json({ ok: false, error: "dev reset is disabled" });
  }

  // Layer 2: token header
  const token = req.headers["x-reset-token"];
  const expected = process.env.DEV_RESET_TOKEN;

  if (!expected || token !== expected) {
    return res.status(401).json({ ok: false, error: "invalid reset token" });
  }

  const repoRoot = path.resolve(process.cwd(), "..", "..");
  const result = devResetAll({ repoRoot });
  return res.json(result);
});

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "platform-api" });
});

// List startups (from store)
app.get("/startups", (_req, res) => {
  return res.json(listStartups());
});

// Create startup sandbox folder + store it
app.post("/startups", (req, res) => {
  const body = req.body as StartupCreateRequest;

  if (!body?.name || body.name.trim().length < 2) {
    return res.status(400).json({ error: "name is required" });
  }

  const slug = body.slug ? slugify(body.slug) : slugify(body.name);
  const { id, ports } = allocatePorts();

  const repoRoot = path.resolve(process.cwd(), "..", "..");

  const created = createSandboxFolder({
    repoRoot,
    startupId: id,
    slug,
    ports
  });

  const record = {
    startupId: id,
    slug,
    ports,
    sandboxName: created.sandboxName,
    sandboxPath: created.sandboxPath,
    createdAt: new Date().toISOString()
  };

  addStartup(record);

  return res.json(record);
});

// Bring up docker compose for a startup
app.post("/startups/:sandboxName/up", async (req, res) => {
  const sandboxName = req.params.sandboxName;

  const startup = findStartupBySandboxName(sandboxName);
  if (!startup) return res.status(404).json({ error: "startup not found" });

  dockerComposeUp(startup.sandboxPath);
  // after containers are up, import n8n workflow template
  await sleep(4000);
  // Wait for n8n & auto-setup owner

  await waitForN8nReady({
    n8nBaseUrl: `http://localhost:${startup.ports.n8nPort}`,
    username: "admin",
    password: "admin123",
  });


  const { browser, page } = await setupN8nOwner({
    n8nHostPort: startup.ports.n8nPort,
    email: "admin@example.com",
    firstName: "Admin",
    lastName: "Startup",
    password: "Admin12345",
    basicAuthUser: "admin",
    basicAuthPass: "admin123",
  });

  const apiKey = await createN8nApiKey({ page, n8nHostPort: startup.ports.n8nPort,label:'publicApi' });
  console.log("🔐 Using API key:", apiKey);
  console.log("🔐 API key length:", apiKey.length);
  const workflow = buildStartupWorkflowTemplate({
    startupId: startup.startupId,
    sandboxName: startup.sandboxName,
  });

  await n8nImportWorkflowPublic({
    n8nBaseUrl: `http://localhost:${startup.ports.n8nPort}`,
    apiKey,
    workflow,
  });

  await browser.close();
  return res.json({ok:true,message:"containers are up"})

});

// Bring down docker compose for a startup
app.post("/startups/:sandboxName/down", (req, res) => {
  const sandboxName = req.params.sandboxName;

  const startup = findStartupBySandboxName(sandboxName);
  if (!startup) return res.status(404).json({ error: "startup not found" });

  dockerComposeDown(startup.sandboxPath);

  return res.json({ ok: true, message: "sandbox stopped" });
});

// Status check
app.get("/startups/:sandboxName/status", (req, res) => {
  const sandboxName = req.params.sandboxName;

  const startup = findStartupBySandboxName(sandboxName);
  if (!startup) return res.status(404).json({ error: "startup not found" });

  const ps = dockerComposePs(startup.sandboxPath);

  return res.json({
    sandboxName,
    containers: ps
  });
});

const PORT = 5050;
app.listen(PORT, () => {
  console.log("platform-api running on http://localhost:" + PORT);
});

// app.post("/startups/:sandboxName/n8n/template", async (req, res) => {
//   try {
//     const sandboxName = req.params.sandboxName;

//     const startup = findStartupBySandboxName(sandboxName);
//     if (!startup) {
//       return res.status(404).json({ ok: false, error: "startup not found" });
//     }

//     // wait a bit to ensure n8n is ready
//     await new Promise((r) => setTimeout(r, 4000));

//     const workflow = buildStartupWorkflowTemplate({
//       startupId: startup.startupId,
//       sandboxName: startup.sandboxName,
//     });

//     const imported =await n8nImportWorkflowViaRest({
//   n8nBaseUrl: `http://localhost:${startup.ports.n8nPort}`,
//   cookie,
//   workflow,
//   basicAuthUser: "admin",
//   basicAuthPass: "admin123",
// });




//     return res.json({ ok: true, imported });
//   } catch (e: any) {
//     return res.status(500).json({ ok: false, error: String(e?.message || e) });
//   }
// });

