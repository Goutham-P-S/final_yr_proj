import { spawn } from "child_process";
import { streamLog } from "./logUtils";
import { registerProcess } from "./processRegistry";

export function runCommand(
  jobId: string,
  command: string,
  args: string[],
  cwd: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: true
    });

    registerProcess(jobId, child);

    child.stdout.on("data", data => {
      streamLog(jobId, data.toString().trim());
    });

    child.stderr.on("data", data => {
      streamLog(jobId, data.toString().trim());
    });

    child.on("close", code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}
