export function plannerTemplate(version: string) {
  return `
import { Planner } from "../contracts";

const planner: Planner = {
  async plan({ requirement, context }) {
    // TODO: Replace with real planning logic (LLM / rules)
    return {
      type: "feedback-analyzer",
      requirement,
      context,
      _plannerVersion: "${version}",
    };
  },
};

export default planner;
`.trim();
}

export function builderTemplate(version: string) {
  return `
import { WorkflowBuilder } from "../contracts";
import { buildStartupWorkflowTemplate } from "../workflowTemplate";

const builder: WorkflowBuilder = {
  build({ startupId, sandboxName, ir }) {
    // TODO: Use IR once schema is finalized
    return buildStartupWorkflowTemplate({
      startupId,
      sandboxName,
    });
  },
};

export default builder;
`.trim();
}
