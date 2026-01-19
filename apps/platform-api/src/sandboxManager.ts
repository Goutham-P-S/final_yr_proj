import fs from "fs";
import path from "path";
import { SandboxPorts } from "./types";
import { writeSandboxEnv } from "./envGenerator";
import { writeWebEnv } from "./webEnvGenerator";
import { buildComposeYml } from "./composeGenerator";


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

export function createSandboxFolder(params: {
  repoRoot: string;
  startupId: number;
  slug: string;
  ports: SandboxPorts;
}) {
  const { repoRoot, startupId, slug, ports } = params;

  const idStr = String(startupId).padStart(4, "0");
  const sandboxName = "startup-" + idStr + "-" + slug;
  const sandboxPath = path.join(repoRoot, "sandboxes", sandboxName);

  fs.mkdirSync(sandboxPath, { recursive: true });

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
