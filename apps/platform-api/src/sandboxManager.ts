import fs from "fs";
import path from "path";
import { SandboxPorts } from "./types";
import { writeSandboxEnv } from "./envGenerator";
import { writeWebEnv } from "./webEnvGenerator";
import { buildComposeYml } from "./composeGenerator";

type VersionMap = {
  infra: string;
  planner: string;
  workflowIR: string;
  builder: string;
};

function versionSignature(v: VersionMap) {
  return `infra-${v.infra}__planner-${v.planner}__ir-${v.workflowIR}__builder-${v.builder}`;
}

export function slugify(input: string) {
  const s = input.trim().toLowerCase();
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const isAZ = ch >= "a" && ch <= "z";
    const is09 = ch >= "0" && ch <= "9";
    if (isAZ || is09) out += ch;
    else out += "-";
  }
  while (out.includes("--")) out = out.replace("--", "-");
  out = out.replace(/^-+/, "").replace(/-+$/, "");
  return out;
}


function seedWebApp(webPath: string) {
  // Minimal node web server (ASCII safe)
  const pkg = `{
  "name": "startup-web",
  "version": "1.0.0",
  "scripts": {
    "dev": "node server.js"
  }
}
`;

  const server = `const http = require("http");

const port = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Startup web running OK\\n");
}).listen(port, () => {
  console.log("Server running on port", port);
});
`;

  fs.writeFileSync(path.join(webPath, "package.json"), pkg, "utf8");
  fs.writeFileSync(path.join(webPath, "server.js"), server, "utf8");
}


function seedBackendApp(backendPath: string) {
  const pkg = `{
  "name": "startup-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "dev": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "cors": "^2.8.5"
  }
}
`;

  const server = `const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: "db",
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
});

// ✅ create table if not exists
async function init() {
  await pool.query(\`
    CREATE TABLE IF NOT EXISTS suggestions (
      id SERIAL PRIMARY KEY,
      startup_id INT,
      sandbox_name TEXT,
      analysis JSONB,
      approved BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  \`);
}
init();

// ✅ receive from n8n
app.post("/api/suggestions", async (req, res) => {
  try {
    const { startupId, sandboxName, analysis } = req.body;

    const result = await pool.query(
      "INSERT INTO suggestions (startup_id, sandbox_name, analysis) VALUES ($1, $2, $3) RETURNING *",
      [startupId, sandboxName, analysis]
    );

    res.json({ ok: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed to store suggestion" });
  }
});

// ✅ fetch suggestions (frontend later)
app.get("/api/suggestions", async (req, res) => {
  const result = await pool.query("SELECT * FROM suggestions ORDER BY created_at DESC");
  res.json(result.rows);
});

app.listen(4000, () => {
  console.log("Backend running on port 4000");
});
`;

  fs.writeFileSync(path.join(backendPath, "package.json"), pkg, "utf8");
  fs.writeFileSync(path.join(backendPath, "server.js"), server, "utf8");
}

export function createSandboxFolder(params: {
  repoRoot: string;
  startupId: number;
  slug: string;
  ports: SandboxPorts;
  versions: {
    infra: string;
    planner: string;
    workflowIR: string;
    builder: string;
  };
})
{
  const { repoRoot, startupId, slug, ports,versions } = params;

  const idStr = String(startupId).padStart(4, "0");
  const sandboxName = "startup-" + idStr + "-" + slug;
  const versionDir = versionSignature(versions);
  const sandboxPath = path.join(
  repoRoot,
  "sandboxes",
  sandboxName,
  versionDir
);
  const dockerDir = path.join(sandboxPath, "docker", "n8n");
  fs.mkdirSync(dockerDir, { recursive: true });

  fs.copyFileSync(
    path.join(repoRoot,"apps","platform-api","src" ,"docker", "n8n", "Dockerfile"),
    path.join(dockerDir, "Dockerfile")
  );



  fs.mkdirSync(sandboxPath, { recursive: true });

  const backendPath = path.join(sandboxPath, "backend");
  fs.mkdirSync(backendPath, { recursive: true });
  const webPath = path.join(sandboxPath, "web");
  fs.mkdirSync(webPath, { recursive: true });
  

  writeWebEnv({
    webPath,
    dbUser: "startup",
    dbPass: "startup",
    dbName: "startupdb",
  });

  fs.mkdirSync(path.join(sandboxPath, "volumes"), { recursive: true });

  // seed the web app so container doesn't crash
  seedWebApp(webPath);
  seedBackendApp(backendPath);
  writeSandboxEnv({
    sandboxPath,
    webPort: ports.webPort,
    dbPort: ports.dbPort,
    n8nPort: ports.n8nPort,
  });

  const containerPrefix = `startup_${String(startupId).padStart(4, "0")}`;
  const composeContent = buildComposeYml({ containerPrefix });
  fs.writeFileSync(path.join(sandboxPath, "docker-compose.yml"), composeContent, "utf8");

  return { sandboxName, sandboxPath };
}
