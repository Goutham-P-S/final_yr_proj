import axios from "axios";

const API_BASE = "http://localhost:5050";

export async function startOrchestration(prompt: string) {
  const res = await axios.post(`${API_BASE}/orchestrate`, {
    prompt
  });

  return res.data.jobId;
}

export async function cancelJob(jobId: string) {
  await axios.post(`${API_BASE}/jobs/${jobId}/cancel`);
}
