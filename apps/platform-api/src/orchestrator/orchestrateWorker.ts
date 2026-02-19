import { updateJob, getJob } from "../jobs/jobStore";
import { broadcast } from "../ws/wsServer";
import { createStartupFromPrompt } from "../lifecycle/createStartup";
import { startContainers } from "../lifecycle/startContainers";
import { runWebDevAgent } from "../agents/webdev/runWebDevAgent";
import { streamLog } from "./logUtils";
import { setStatus } from "./statusUtils";
import { runCommand } from "./runCommand";
import { waitForN8nReady } from "../n8n/waitForN8n";
import { setupN8nOwner } from "../n8n/setupN8n";
import { createN8nApiKey } from "../n8n/createN8nApiKey";
import { resolveVersions } from "../n8n/versionResolver";
import { n8nImportWorkflowPublic } from "../n8n/n8nClient";

function ensureNotCancelled(jobId: string) {
  const job = getJob(jobId);
  if (job?.status === "cancelled") {
    throw new Error("Job cancelled");
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function runOrchestration(
  jobId: string,
  prompt: string
) {
  try {
    //
    // 🧠 Planning
    //
    setStatus(jobId, "planning");
    streamLog(jobId, "Planning startup architecture...");
    ensureNotCancelled(jobId);

    //
    // 🏗 Create Sandbox
    //
    setStatus(jobId, "creating-sandbox");
    streamLog(jobId, "Creating sandbox folder...");
    ensureNotCancelled(jobId);

    const startup = createStartupFromPrompt(prompt);

    streamLog(jobId, `Sandbox created: ${startup.sandboxName}`);
    ensureNotCancelled(jobId);

    //
    // ⚙ Generate Backend + Frontend
    //
    setStatus(jobId, "generating-code");
    streamLog(jobId, "Generating backend and frontend...");
    ensureNotCancelled(jobId);

    await runWebDevAgent({
      startupId: startup.startupId,
      sandboxPath: startup.sandboxPath,
      requirement: prompt,
      jobId
    });

    streamLog(jobId, "Code generation completed.");
    ensureNotCancelled(jobId);

    //
    // 🚀 Start Containers
    //
    setStatus(jobId, "starting-containers");
    streamLog(jobId, "Starting Docker containers...");
    ensureNotCancelled(jobId);

    startContainers(startup);

    streamLog(jobId, "Containers started.");
    streamLog(jobId, "Waiting for database to be ready...");

    // Wait for DB container to fully initialize
    await sleep(7000);

    ensureNotCancelled(jobId);

    //
    // 🗄 Run Prisma migration inside backend container
    //
    const backendContainer = `startup_${String(startup.startupId).padStart(4, "0")}_backend`;

    streamLog(jobId, "Running Prisma migration inside container...");

  await runCommand(
    jobId,
    "docker",
    [
      "exec",
      backendContainer,
      "npx",
      "prisma",
      "db",
      "push"
    ],
    startup.sandboxPath
  );



    streamLog(jobId, "Database migration completed.");

    ensureNotCancelled(jobId);

    //
    // ⏳ Wait For n8n
    //
    setStatus(jobId, "waiting-for-n8n");
    streamLog(jobId, "Waiting for n8n to become ready...");

    await waitForN8nReady({
      n8nBaseUrl: `http://localhost:${startup.ports.n8nPort}`,
      username: "admin",
      password: "admin123"
    });

    streamLog(jobId, "n8n is ready.");
    ensureNotCancelled(jobId);

    //
    // ⚙ Configure n8n Owner
    //
    setStatus(jobId, "configuring-n8n");
    streamLog(jobId, "Configuring n8n owner account...");

    const { browser, page } = await setupN8nOwner({
      n8nHostPort: startup.ports.n8nPort,
      email: "admin@example.com",
      firstName: "Admin",
      lastName: "Startup",
      password: "Admin12345",
      basicAuthUser: "admin",
      basicAuthPass: "admin123",
    });

    const apiKey = await createN8nApiKey({
      page,
      n8nHostPort: startup.ports.n8nPort,
      label: "publicApi"
    });

    streamLog(jobId, "n8n configured successfully.");
    ensureNotCancelled(jobId);

    //
    // 🧠 Generate Workflow
    //
    setStatus(jobId, "generating-workflow");
    streamLog(jobId, "Generating AI workflow...");

    const resolved = await resolveVersions({
      versions: startup.versions
    });

    const ir = await resolved.planner.plan({
      requirement: prompt,
      context: {
        startupId: startup.startupId,
        sandboxName: startup.sandboxName
      }
    });

    const workflow = resolved.builder.build({
      startupId: startup.startupId,
      sandboxName: startup.sandboxName,
      ir
    });

    streamLog(jobId, "Workflow generated.");
    ensureNotCancelled(jobId);

    //
    // 📥 Import Workflow
    //
    setStatus(jobId, "importing-workflow");
    streamLog(jobId, "Importing workflow into n8n...");

    await n8nImportWorkflowPublic({
      n8nBaseUrl: `http://localhost:${startup.ports.n8nPort}`,
      apiKey,
      workflow
    });

    await browser.close();

    streamLog(jobId, "Workflow imported successfully.");
    ensureNotCancelled(jobId);

    //
    // ✅ Completed
    //
    const result = {
      webUrl: `http://localhost:${startup.ports.webPort}`,
      n8nUrl: `http://localhost:${startup.ports.n8nPort}`
    };

    updateJob(jobId, {
      status: "completed",
      result
    });

    broadcast({
      jobId,
      status: "completed",
      result
    });

    streamLog(jobId, "Startup deployment completed successfully.");

  } catch (err: any) {
    if (err.message === "Job cancelled") {
      streamLog(jobId, "Job was cancelled.");
      return;
    }

    streamLog(jobId, `Error: ${err.message}`);

    updateJob(jobId, {
      status: "failed",
      error: err.message
    });

    broadcast({
      jobId,
      status: "failed",
      error: err.message
    });
  }
}
