import fs from "fs";
import path from "path";
import { execSync } from "child_process";

function safeExec(cmd: string) {
  try {
    execSync(cmd, { stdio: "pipe" });
  } catch {
    // ignore
  }
}
export function dockerComposeRecreate(envFile: string) {
  execSync(`docker compose --env-file ${envFile} down --volumes`, { stdio: "inherit" });
  execSync(`docker compose --env-file ${envFile} up -d`, { stdio: "inherit" });
}

export function devResetAll(params: { repoRoot: string }) {
  const { repoRoot } = params;

  // 1️⃣ Remove containers
  try {
    const containers = execSync(
      `docker ps -a --format "{{.ID}} {{.Names}}"`,
      { stdio: "pipe" }
    ).toString("utf8");

    for (const line of containers.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const [id, name] = line.split(" ");
      if (name.startsWith("startup_")) {
        safeExec(`docker rm -f ${id}`);
      }
    }
  } catch {}

  // 2️⃣ Remove volumes
  try {
    const volumes = execSync(
      `docker volume ls --format "{{.Name}}"`,
      { stdio: "pipe" }
    ).toString("utf8");

    for (const v of volumes.split(/\r?\n/)) {
      if (!v.trim()) continue;
      if (v.includes("startup_")) {
        safeExec(`docker volume rm ${v}`);
      }
    }
  } catch {}

  // 3️⃣ Remove network
  safeExec("docker network rm startup_net");

  // 4️⃣ Delete sandbox folders
  const sandboxesPath = path.join(repoRoot, "sandboxes");
  if (fs.existsSync(sandboxesPath)) {
    fs.rmSync(sandboxesPath, { recursive: true, force: true });
  }

  // 5️⃣ Reset store files
  const storeFile = path.resolve(process.cwd(), "startups.store.json");
  if (fs.existsSync(storeFile)) {
    fs.rmSync(storeFile, { force: true });
  }

  const portsFile = path.resolve(process.cwd(), "ports.state.json");
  if (fs.existsSync(portsFile)) {
    fs.rmSync(portsFile, { force: true });
  }

  return { ok: true, message: "Full reset complete" };
}

