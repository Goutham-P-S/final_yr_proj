import { Planner } from "../../contracts";

const planner: Planner = {
  async plan({ requirement, context }) {
    // TODO: Replace with real planning logic (LLM / rules)
    return {
      type: "feedback-analyzer",
      requirement,
      context,
      _plannerVersion: "v1",
    };
  },
};

export default planner;