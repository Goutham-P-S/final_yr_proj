export type IRv1 = {
  kind: "workflow";
  version: "v1";

  trigger: {
    type: "cron";
    everyMinutes: number;
  };

  source: {
    type: "http";
    path: string; // internal web API path
  };

  processing: {
    type: "llm-analysis";
    model: string;
    instruction: string;
  };

  sink: {
    type: "platform-api";
    path: string; // relative API path
  };
};
