import { Router } from "express";
import { cancelJob } from "../jobs/cancelJob";

const router = Router();

router.post("/:jobId/cancel", (req, res) => {
  const { jobId } = req.params;

  cancelJob(jobId);

  res.json({ ok: true });
});

export default router;
