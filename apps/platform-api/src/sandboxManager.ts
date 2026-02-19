import fs from "fs";
import path from "path";
import { SandboxPorts } from "./types";
import { writeSandboxEnv } from "./envGenerator";
import { writeWebEnv } from "./webEnvGenerator";
import { buildComposeYml } from "./composeGenerator";
import { writeBackendEnv } from "./backendEnvGenerator";

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


function seedBackendSkeleton(backendPath: string) {
  const pkg = {
    name: "startup-backend",
    version: "1.0.0",
    scripts: {
      dev: "ts-node-dev --respawn --transpile-only src/index.ts",
      build: "tsc",
      start: "node dist/index.js"
    },
    dependencies: {
      express: "^4.18.2",
      cors: "^2.8.5",
      "@prisma/client": "^5.0.0"
    },
    devDependencies: {
      typescript: "^5.0.0",
      "ts-node-dev": "^2.0.0",
      prisma: "^5.0.0",
      "@types/express": "^4.17.0"
    }
  };

  fs.writeFileSync(
    path.join(backendPath, "package.json"),
    JSON.stringify(pkg, null, 2)
  );

  fs.writeFileSync(
    path.join(backendPath, "tsconfig.json"),
`{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true
  }
}`
  );

  const prismaDir = path.join(backendPath, "prisma");
  fs.mkdirSync(prismaDir, { recursive: true });

  // Temporary placeholder schema (will be replaced by WebDevAgent)
  fs.writeFileSync(
    path.join(prismaDir, "schema.prisma"),
`generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Placeholder {
  id Int @id @default(autoincrement())
}
`
  );

  const srcDir = path.join(backendPath, "src");
  fs.mkdirSync(srcDir, { recursive: true });

  fs.writeFileSync(
    path.join(srcDir, "index.ts"),
`
import express from "express";

const app = express();
app.get("/", (_, res) => {
  res.json({ message: "Backend skeleton ready" });
});

app.listen(4000, () => {
  console.log("Backend running on port 4000");
});
`
  );
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
  const postgresDir=path.join(sandboxPath,"docker","postgres")
  fs.mkdirSync(postgresDir, { recursive: true });
  fs.copyFileSync(
      path.join(repoRoot,"apps","platform-api","src" ,"docker", "postgres","init.sql"),
      path.join(postgresDir,"init.sql")
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
  writeBackendEnv({backendPath,
    dbUser: "startup",
    dbPass: "startup",
    dbName: "startupdb",});
  seedBackendSkeleton(backendPath);


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
