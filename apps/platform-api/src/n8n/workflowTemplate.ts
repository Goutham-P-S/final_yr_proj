export function buildStartupWorkflowTemplate(params: {
  startupId: number;
  sandboxName: string;

  // URLs reachable FROM INSIDE the n8n container
  startupWebInternalUrl?: string;   // default http://web:3000
  platformApiInternalUrl?: string;  // default http://host.docker.internal:5050
  ollamaInternalUrl?: string;       // default http://host.docker.internal:11434/api/generate
}) {
  const {
    startupId,
    sandboxName,
    startupWebInternalUrl = "http://web:3000",
    platformApiInternalUrl = "http://host.docker.internal:5050",
    ollamaInternalUrl = "http://host.docker.internal:11434/api/generate",
  } = params;

  return {
    name: `Startup-${startupId} Feedback Analyzer`,
    active: true,

    nodes: [
      {
        id: "cron_trigger",
        name: "Every 1 minute",
        type: "n8n-nodes-base.cron",
        typeVersion: 1,
        position: [250, 250],
        parameters: {
          rule: { interval: [{ field: "minutes", minutesInterval: 1 }] },
        },
      },

      {
        id: "get_feedback",
        name: "Fetch feedback",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4,
        position: [520, 250],
        parameters: {
          url: `${startupWebInternalUrl}/api/feedback`,
          method: "GET",
          responseFormat: "json",
        },
      },

      {
        id: "build_prompt",
        name: "Build prompt",
        type: "n8n-nodes-base.function",
        typeVersion: 2,
        position: [780, 250],
        parameters: {
          functionCode: `
const list = $json.feedback || [];
const top = list.slice(0, 30).map(f => "- " + f.message).join("\\n");

return [{
  json: {
    sandboxName: "${sandboxName}",
    startupId: ${startupId},
    prompt: "You are a product analyst. Read the feedback and return ONLY JSON with keys: summary, topProblems[], topFeatureRequests[], quickWins[].\\n\\nFeedback:\\n" + top
  }
}];
          `.trim(),
        },
      },

      {
        id: "ollama_analyze",
        name: "Ollama analyze",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4,
        position: [1040, 250],
        parameters: {
          url: ollamaInternalUrl,
          method: "POST",
          responseFormat: "json",
          jsonParameters: true,
          options: {},
          bodyParametersJson: `{
  "model": "llama3.1",
  "prompt": "{{$json.prompt}}",
  "stream": false
}`,
        },
      },

      {
        id: "send_platform",
        name: "Send to platform",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4,
        position: [1300, 250],
        parameters: {
          url: `${platformApiInternalUrl}/startups/${sandboxName}/suggestions`,
          method: "POST",
          responseFormat: "json",
          jsonParameters: true,
          options: {},
          bodyParametersJson: `{
  "startupId": ${startupId},
  "sandboxName": "${sandboxName}",
  "analysis": {{$json}}
}`,
        },
      },
    ],

    connections: {
      "Every 1 minute": {
        main: [[{ node: "Fetch feedback", type: "main", index: 0 }]],
      },
      "Fetch feedback": {
        main: [[{ node: "Build prompt", type: "main", index: 0 }]],
      },
      "Build prompt": {
        main: [[{ node: "Ollama analyze", type: "main", index: 0 }]],
      },
      "Ollama analyze": {
        main: [[{ node: "Send to platform", type: "main", index: 0 }]],
      },
    },

    settings: {},
  };
}
