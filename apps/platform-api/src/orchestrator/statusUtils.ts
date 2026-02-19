import { updateJob, JobStatus } from "../jobs/jobStore";
import { broadcast } from "../ws/wsServer";

export function setStatus(jobId: string, status: JobStatus) {
  updateJob(jobId, { status });

  broadcast({
    jobId,
    status
  });
}
