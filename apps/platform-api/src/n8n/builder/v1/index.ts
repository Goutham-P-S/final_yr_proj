import { WorkflowBuilder } from "../../contracts";
import { buildStartupWorkflowTemplate } from "../../workflowTemplate";

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