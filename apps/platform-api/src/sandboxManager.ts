import fs from "fs";
import path from "path";
import { SandboxPorts } from "./types";

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

  fs.mkdirSync(path.join(sandboxPath, "volumes"), { recursive: true });

  // seed the web app so container doesn't crash
  seedWebApp(webPath);

  const envContent =
    "WEB_PORT=" + ports.webPort + "\n" +
    "DB_PORT=" + ports.dbPort + "\n" +
    "N8N_PORT=" + ports.n8nPort + "\n";

  fs.writeFileSync(path.join(sandboxPath, ".env"), envContent, "utf8");

  const containerPrefix = "startup_" + idStr;

  const composeContent = `services:
  db:
    image: postgres:16
    container_name: ${containerPrefix}_db
    restart: unless-stopped
    environment:
      POSTGRES_USER: startup
      POSTGRES_PASSWORD: startup
      POSTGRES_DB: startupdb
    ports:
      - "\${DB_PORT}:5432"
    volumes:
      - db_data:/var/lib/postgresql/data
    networks:
      - startup_net

  n8n:
    image: n8nio/n8n:latest
    container_name: ${containerPrefix}_n8n
    restart: unless-stopped
    ports:
      - "\${N8N_PORT}:5678"
    environment:
      - NODE_ENV=production
      - GENERIC_TIMEZONE=Asia/Kolkata
      - DB_TYPE=sqlite
    volumes:
      - n8n_data:/home/node/.n8n
    networks:
      - startup_net

  web:
    image: node:20-alpine
    container_name: ${containerPrefix}_web
    working_dir: /app
    restart: unless-stopped
    ports:
      - "\${WEB_PORT}:3000"
    environment:
      - PORT=3000
    volumes:
      - ./web:/app
    command: sh -c "npm install && npm run dev"
    depends_on:
      - db
    networks:
      - startup_net

volumes:
  db_data:
  n8n_data:

networks:
  startup_net:
    driver: bridge
`;

  fs.writeFileSync(path.join(sandboxPath, "docker-compose.yml"), composeContent, "utf8");

  return { sandboxName, sandboxPath };
}
