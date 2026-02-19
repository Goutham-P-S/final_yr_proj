import { ChildProcess } from "child_process";

const processMap = new Map<string, ChildProcess[]>();

export function registerProcess(jobId: string, proc: ChildProcess) {
  if (!processMap.has(jobId)) {
    processMap.set(jobId, []);
  }

  processMap.get(jobId)!.push(proc);
}

export function killJobProcesses(jobId: string) {
  const procs = processMap.get(jobId);
  if (!procs) return;

  for (const proc of procs) {
    try {
      proc.kill("SIGTERM");
    } catch {}
  }

  processMap.delete(jobId);
}
