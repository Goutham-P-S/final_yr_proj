import { updateJob } from "../jobs/jobStore";
import { broadcast } from "../ws/wsServer";
import { createStartupFromPrompt } from "../lifecycle/createStartup";
import { startContainers } from "../lifecycle/startContainers";
import { runWebDevAgent } from "../agents/webdev/runWebDevAgent";

export async function runOrchestration(
  jobId: string,
  prompt: string
) {
  try {
    //
    // 🧠 Planning
    //
    updateJob(jobId, { status: "planning" });
    broadcast({ jobId, status: "planning" });

    //
    // 🏗 Create Sandbox
    //
    updateJob(jobId, { status: "creating-sandbox" });
    broadcast({ jobId, status: "creating-sandbox" });

    const startup = createStartupFromPrompt(prompt);

    //
    // ⚙ Generate Backend + Frontend
    //
    updateJob(jobId, { status: "generating-code" });
    broadcast({ jobId, status: "generating-code" });

    await runWebDevAgent({
      startupId: startup.startupId,
      sandboxPath: startup.sandboxPath,
      requirement: prompt
    });

    //
    // 🚀 Start Containers
    //
    updateJob(jobId, { status: "starting-containers" });
    broadcast({ jobId, status: "starting-containers" });

    startContainers(startup);

    //
    // ✅ Completed
    //
  const result = {
    webUrl: `http://localhost:${startup.ports.webPort}`
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

  } catch (err: any) {
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
