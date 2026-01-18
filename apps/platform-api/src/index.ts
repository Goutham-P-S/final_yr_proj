import express from "express";
import cors from "cors";
import path from "path";

import { allocatePorts } from "./portAllocator";
import { createSandboxFolder, slugify } from "./sandboxManager";
import { StartupCreateRequest } from "./types";

import { addStartup, listStartups, findStartupBySandboxName } from "./startupStore";
import { dockerComposeUp, dockerComposeDown, dockerComposePs } from "./dockerRunner";

const app = express();
app.use(cors());
app.use(express.json());

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
app.post("/startups/:sandboxName/up", (req, res) => {
  const sandboxName = req.params.sandboxName;

  const startup = findStartupBySandboxName(sandboxName);
  if (!startup) return res.status(404).json({ error: "startup not found" });

  dockerComposeUp(startup.sandboxPath);

  return res.json({
    ok: true,
    message: "sandbox started",
    urls: {
      web: "http://localhost:" + startup.ports.webPort,
      n8n: "http://localhost:" + startup.ports.n8nPort
    }
  });
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
