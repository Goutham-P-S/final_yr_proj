import { updateJob } from "./jobStore";
import { killJobProcesses } from "../orchestrator/processRegistry";
import { broadcast } from "../ws/wsServer";

export function cancelJob(jobId: string) {
  killJobProcesses(jobId);

  updateJob(jobId, { status: "cancelled" });

  broadcast({
    jobId,
    status: "cancelled"
  });
}
