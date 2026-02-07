export interface Planner {
  plan(input: {
    requirement: string;
    context?: any;
  }): Promise<any>;
}

export interface WorkflowBuilder {
  build(input: {
    startupId: number;
    sandboxName: string;
    ir: any;
  }): any; // n8n workflow JSON
}
