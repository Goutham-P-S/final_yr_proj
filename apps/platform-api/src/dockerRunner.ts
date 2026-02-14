import { execSync } from "child_process";

export function dockerComposeUp(sandboxPath: string, projectName: string) {
  const cmd = `docker compose -p ${projectName} --env-file .env up -d`;
  console.log("RUNNING:", cmd);
  execSync(cmd, { cwd: sandboxPath, stdio: "inherit" });
}

export function dockerComposeDown(sandboxPath: string) {
  const cmd = "docker compose down";
  console.log("RUNNING:", cmd);
  execSync(cmd, { cwd: sandboxPath, stdio: "inherit" });
}

export function dockerComposePs(sandboxPath: string) {
  const cmd = "docker compose ps";
  console.log("RUNNING:", cmd);
  const output = execSync(cmd, { cwd: sandboxPath, stdio: "pipe" });
  return output.toString("utf8");
}
