import { llamaChat } from "../llamaClient";
import { validateBackendPlan } from "./backendPlanValidator";

const MAX_RETRIES = 3;

export async function planBackendArchitecture(
  requirement: string
) {
  const system = `
You are a senior backend architect.

Design a PostgreSQL relational schema.

STRICT RULES:

- Use ONLY Prisma types:
  String, Int, Boolean, Float, DateTime, Json

- Every entity MUST include:
  id Int (isId: true)

- Relations must follow this structure:
  {
    "field": "relationFieldName",
    "target": "TargetModel",
    "type": "one-to-one" | "one-to-many" | "many-to-one",
    "foreignKey": "fieldNameIfApplicable",
    "references": "TargetModel.id"
  }

- No explanations.
- JSON only.

Return format:

{
  "entities": [
    {
      "name": "ModelName",
      "fields": [],
      "relations": []
    }
  ]
}
`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`🧠 Backend planning attempt ${attempt}`);

      const response = await llamaChat({
        system,
        user: requirement,
        temperature: 0
      });

      const parsed = JSON.parse(response);

      validateBackendPlan(parsed);

      console.log("✅ Backend plan validated");
      return parsed;

    } catch (err: any) {
      console.error("❌ Invalid plan:", err.message);

      if (attempt === MAX_RETRIES) {
        throw new Error("Backend planning failed");
      }
    }
  }

  throw new Error("Planner failure");
}
