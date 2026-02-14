import { Planner } from "../../contracts";
import { IRv1 } from "../../ir/v1.types";

const planner: Planner = {
  async plan({ requirement, context }) {
    const ir: IRv1 = {
      kind: "workflow",
      version: "v1",

      trigger: {
        type: "cron",
        everyMinutes: 1,
      },

      source: {
        type: "http",
        path: "/api/feedback",
      },

      processing: {
        type: "llm-analysis",
        model: "llama3.1",
        instruction:
          "Summarize feedback and extract top problems, feature requests, and quick wins.",
      },

      sink: {
        type: "platform-api",
        path: `/startups/${context.sandboxName}/suggestions`,
      },
    };

    return ir;
  },
};

export default planner;
