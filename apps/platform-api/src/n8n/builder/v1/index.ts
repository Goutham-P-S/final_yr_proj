import { WorkflowBuilder } from "../../contracts";
import { IRv1 } from "../../ir/v1.types";
import { IRv1Schema } from "../../ir/v1.schema";
import { buildStartupWorkflowTemplate } from "../../workflowTemplate";

const builder: WorkflowBuilder = {
  build({ startupId, sandboxName, ir }) {
    // 🔐 Validate IR
    const parsed = IRv1Schema.parse(ir) as IRv1;

    // v1 builder ignores flexibility and builds fixed template
    return buildStartupWorkflowTemplate({
      startupId,
      sandboxName,
    });
  },
};

export default builder;
