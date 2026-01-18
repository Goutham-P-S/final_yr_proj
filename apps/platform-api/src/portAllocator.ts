import fs from "fs";
import path from "path";
import { SandboxPorts } from "./types";

const STATE_FILE = path.resolve(process.cwd(), "ports.state.json");

type State = { nextId: number };

function loadState(): State {
  if (!fs.existsSync(STATE_FILE)) return { nextId: 1 };
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
}

function saveState(state: State) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function allocatePorts(): { id: number; ports: SandboxPorts } {
  const state = loadState();
  const id = state.nextId;

  const ports: SandboxPorts = {
    webPort: 3000 + id,
    dbPort: 5432 + id,
    n8nPort: 5678 + id,
  };

  state.nextId += 1;
  saveState(state);

  return { id, ports };
}
