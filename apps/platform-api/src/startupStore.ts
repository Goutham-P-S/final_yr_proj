import fs from "fs";
import path from "path";
import { SandboxPorts, StartupVersions } from "./types";

export type StartupRecord = {
  startupId: number;
  slug: string;
  sandboxName: string;
  sandboxPath: string;
  ports: SandboxPorts;
  createdAt: string;

  // 🔐 Version pinning (NEW)
  versions: StartupVersions;
};


const STORE_FILE = path.resolve(process.cwd(), "startups.store.json");

function loadAll(): StartupRecord[] {
  if (!fs.existsSync(STORE_FILE)) return [];
  return JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
}

function saveAll(items: StartupRecord[]) {
  fs.writeFileSync(STORE_FILE, JSON.stringify(items, null, 2), "utf8");
}

export function addStartup(record: StartupRecord) {
  const all = loadAll();
  all.push(record);
  saveAll(all);
}

export function listStartups(): StartupRecord[] {
  return loadAll();
}

export function findStartupBySandboxName(sandboxName: string): StartupRecord | null {
  const all = loadAll();
  return all.find((s) => s.sandboxName === sandboxName) ?? null;
}
