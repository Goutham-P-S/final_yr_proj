import { llamaChat } from "../llamaClient";
import { normalizeBackendPlan } from "./normalizeBackendPlan";

function extractJSON(text: string) {
  const cleaned = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  const match = cleaned.match(/\{[\s\S]*\}/);

  if (!match) {
    throw new Error("No valid JSON found in LLM output");
  }

  return JSON.parse(match[0]);
}

export async function planBackendArchitecture(
  requirement: string
) {
  console.log("🧠 Backend planning...");

const system = `
You are a senior backend architect.

Design business entities for a relational database.

STRICT RULES:
- Only output JSON.
- Do NOT include explanations.
- Do NOT use markdown.
- Do NOT include backticks.
- Do NOT include id fields.
- Do NOT include foreignKey fields.
- Do NOT include Prisma syntax.

Return format:

{
  "entities": [
    {
      "name": "ModelName",
      "fields": ["field1", "field2"],
      "relations": [
        {
          "target": "OtherModel",
          "type": "one-to-one" | "one-to-many" | "many-to-one"
        }
      ]
    }
  ]
}
`;
  const response = await llamaChat({
    system,
    user: requirement,
    temperature: 0
  });

  const parsed = extractJSON(response);

  const normalized = normalizeBackendPlan(parsed);

  console.log("✅ Backend plan normalized");

  return normalized;
}





