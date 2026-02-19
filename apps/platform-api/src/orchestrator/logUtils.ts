import { appendLog } from "../jobs/jobStore";
import { broadcast } from "../ws/wsServer";

export function streamLog(jobId: string, message: string) {
  appendLog(jobId, message);

  broadcast({
    jobId,
    type: "log",
    message
  });
}
