export function buildStartupWorkflowTemplate(params: {
  startupId: number;
  sandboxName: string;
  startupWebInternalUrl?: string; // default http://web:3000
}) {
  const {
    startupId,
    sandboxName,
    startupWebInternalUrl = "http://web:3000",
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

      // ✅ FIXED BUILD PROMPT NODE
      {
  id: "build_prompt",
  name: "Build prompt",
  type: "n8n-nodes-base.code",
  typeVersion: 2, // 👈 IMPORTANT (use v2)
  position: [780, 250],
  parameters: {
    jsCode: `
const items = $input.all();

if (!items.length) {
  return [{
    json: {
      sandboxName: "${sandboxName}",
      startupId: ${startupId},
      prompt: "No feedback available"
    }
  }];
}

return items.map(item => {
  const data = item.json ?? {};

  let feedback = [];
  if (Array.isArray(data.feedback)) feedback = data.feedback;
  else if (Array.isArray(data.data)) feedback = data.data;

  const top = feedback
    .slice(0, 30)
    .map(f => {
      if (typeof f === "string") return "- " + f;
      if (f?.message) return "- " + f.message;
      return "- " + JSON.stringify(f);
    })
    .join("\\n");

  return {
    json: {
      sandboxName: "${sandboxName}",
      startupId: ${startupId},
      prompt:
        "You are a product analyst. Read the feedback and return ONLY JSON with keys: summary, topProblems[], topFeatureRequests[], quickWins[].\\n\\nFeedback:\\n" +
        (top || "No feedback found")
    }
  };
});
    `.trim(),
  },
}
,

{
  id: "ollama_analyze",
  name: "Ollama analyze",
  type: "n8n-nodes-base.httpRequest",
  typeVersion: 4,
  position: [1040, 250],
  parameters: {
    url: "={{ $env.OLLAMA_URL }}",
    method: "POST",
    responseFormat: "json",

    sendBody: true,
    specifyBody: "json",

    jsonBody: "={{ { \
  model: 'llama3.1', \
  prompt: $json.prompt || 'No prompt provided', \
  stream: false \
} }}",
  },
}

,

      {
        id: "send_platform",
        name: "Send to platform",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4,
        position: [1300, 250],
        parameters: {
          url: "http://backend:4000/api/suggestions",
          method: "POST",
          responseFormat: "json",
          sendBody:true,
          specifyBody:"json",
          jsonBody:`={"startupId":{{$("Build prompt").item.json.startupId}},
  "sandboxName":{{$("Build prompt").item.json.sandboxName.toJsonString()}},
  "analysis": {{$json.response.replaceSpecialChars().replaceAll("\`\`\`","").toJsonString()}}
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
