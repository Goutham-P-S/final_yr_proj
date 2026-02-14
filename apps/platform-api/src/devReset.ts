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

  // 1) remove startup containers
  safeExec(`docker ps -a --format "{{.ID}} {{.Names}}" | findstr startup_`);

  try {
    const out = execSync(`docker ps -a --format "{{.ID}} {{.Names}}"`, {
      stdio: "pipe",
    }).toString("utf8");

    const lines = out.split(/\r?\n/).filter(Boolean);

    for (const line of lines) {
      const parts = line.split(" ");
      const id = parts[0];
      const name = parts.slice(1).join(" ");
      if (name.startsWith("startup_")) {
        safeExec(`docker rm -f ${id}`);
      }
    }
  } catch {
    // ignore
  }

  // 2) remove startup networks
  try {
    const nets = execSync(`docker network ls --format "{{.Name}}"`, {
      stdio: "pipe",
    }).toString("utf8");

    const lines = nets.split(/\r?\n/).filter(Boolean);
    for (const n of lines) {
      if (n.startsWith("startup-")) {
        safeExec(`docker network rm ${n}`);
      }
    }
  } catch {
    // ignore
  }

  // 3) remove startup volumes (optional)
  try {
    const vols = execSync(`docker volume ls --format "{{.Name}}"`, {
      stdio: "pipe",
    }).toString("utf8");

    const lines = vols.split(/\r?\n/).filter(Boolean);
    for (const v of lines) {
      if (
        v.startsWith("startup-") ||
        v.startsWith("infra-") ||
        v.includes("__planner-")||
        v.includes("n8n_data")
      ) {
        safeExec(`docker volume rm ${v}`);
      }

    }
  } catch {
    // ignore
  }

  // 4) delete sandboxes/startup-* folders
  const sandboxesPath = path.join(repoRoot, "sandboxes");
  if (fs.existsSync(sandboxesPath)) {
    const items = fs.readdirSync(sandboxesPath);
    for (const item of items) {
      if (item.startsWith("startup-")) {
        const full = path.join(sandboxesPath, item);
        fs.rmSync(full, { recursive: true, force: true });
      }
    }
  }

  // 5) remove store file (if you are using it)
  const storeFile = path.resolve(process.cwd(), "startups.store.json");
  if (fs.existsSync(storeFile)) {
    fs.rmSync(storeFile, { force: true });
  }

  // 6) reset port allocator file if you created one (optional)
  const portsFile = path.resolve(process.cwd(), "ports.store.json");
  if (fs.existsSync(portsFile)) {
    fs.rmSync(portsFile, { force: true });
  }

  return { ok: true, message: "Reset complete" };
}
