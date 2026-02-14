import { z } from "zod";

export const IRv1Schema = z.object({
  kind: z.literal("workflow"),
  version: z.literal("v1"),

  trigger: z.object({
    type: z.literal("cron"),
    everyMinutes: z.number().min(1).max(1440),
  }),

  source: z.object({
    type: z.literal("http"),
    path: z.string().startsWith("/"),
  }),

  processing: z.object({
    type: z.literal("llm-analysis"),
    model: z.string().min(1),
    instruction: z.string().min(10),
  }),

  sink: z.object({
    type: z.literal("platform-api"),
    path: z.string().startsWith("/"),
  }),
});
