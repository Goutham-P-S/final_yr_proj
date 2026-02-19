export type JobStatus =
  | "queued"
  | "planning"
  | "creating-sandbox"
  | "generating-code"
  | "starting-containers"
  | "waiting-for-n8n"
  | "configuring-n8n"
  | "generating-workflow"
  | "importing-workflow"
  | "completed"
  | "failed"
  | "cancelled";


export interface Job {
  id: string;
  status: JobStatus;
  logs: string[];
  result?: any;
  error?: string;
}

const jobs = new Map<string, Job>();

export function createJob(id: string): Job {
  const job: Job = {
    id,
    status: "queued",
    logs: []
  };

  jobs.set(id, job);
  return job;
}

export function getJob(id: string) {
  return jobs.get(id);
}

export function updateJob(
  id: string,
  updates: Partial<Job>
) {
  const job = jobs.get(id);
  if (!job) return;

  // Merge logs properly
  if (updates.logs) {
    job.logs.push(...updates.logs);
    delete updates.logs;
  }

  Object.assign(job, updates);
}
export function appendLog(id: string, message: string) {
  const job = jobs.get(id);
  if (!job) return;

  const timestamp = new Date().toISOString();
  job.logs.push(`[${timestamp}] ${message}`);
}
