import { runOrchestration } from "../orchestrator/orchestrateWorker";
import { setStatus } from "../orchestrator/statusUtils";

const MAX_CONCURRENT_JOBS = 2;

let running = 0;
const queue: { jobId: string; prompt: string }[] = [];

export function enqueueJob(jobId: string, prompt: string) {
  queue.push({ jobId, prompt });
  processQueue();
}

function processQueue() {
  if (running >= MAX_CONCURRENT_JOBS) return;
  if (queue.length === 0) return;

  const job = queue.shift();
  if (!job) return;

  running++;

  runOrchestration(job.jobId, job.prompt)
    .catch(() => {})
    .finally(() => {
      running--;
      processQueue();
    });
}
