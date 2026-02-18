import { extractStartupName } from "./extractName";
import { createStartup, bringStartupUp } from "./platformClient";
import { runWebDevAgent } from "../webdev/runWebDevAgent";

export async function runOrchestrator(userPrompt: string) {
  console.log("🚀 Orchestrator started");

  // 1️⃣ Extract intelligent name via LLaMA
  const startupName = await extractStartupName(userPrompt);
  console.log("📦 Startup name:", startupName);

  // 2️⃣ Create startup sandbox
  const startup = await createStartup(startupName);
  console.log("✅ Startup created:", startup.sandboxName);

  // 3️⃣ Run Web Dev Agent (FULL BACKEND REPLACEMENT)
  await runWebDevAgent({
    startupId: startup.startupId,
    sandboxPath: startup.sandboxPath,
    requirement: userPrompt
  });

  // 4️⃣ Bring containers up
  await bringStartupUp(startup.sandboxName, userPrompt);

  console.log("🎉 Startup live!");

  return startup;
}
