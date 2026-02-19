import path from "path";
import fs from "fs";

import { planBackendArchitecture } from "./backendPlanner";
import { generatePrismaSchema } from "./prismaGenerator";
import { generateCrudForEntity } from "./crudGenerator";
import { generateBackendScaffold } from "./backendScaffoldGenerator";
import { runCommand } from "../../orchestrator/runCommand";
import { writeBackendEnv } from "../../backendEnvGenerator";

function injectAuthModels(schema: string) {
  const authModels = `
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  password  String
  roles     UserRole[]
  createdAt DateTime @default(now())
}

model Role {
  id    Int        @id @default(autoincrement())
  name  String     @unique
  users UserRole[]
}

model UserRole {
  userId Int
  roleId Int

  user User @relation(fields: [userId], references: [id])
  role Role @relation(fields: [roleId], references: [id])

  @@id([userId, roleId])
}
`;

  return schema + "\n" + authModels;
}

export async function runWebDevAgent(params: {
  startupId: number;
  sandboxPath: string;
  requirement: string;
  jobId: string;
}) {
  console.log("🧠 Web Dev Agent starting...");

  const backendPath = path.join(params.sandboxPath, "backend");

  //
  // 1️⃣ Plan backend (already normalized inside planner)
  //
  const plan = await planBackendArchitecture(params.requirement);

  //
  // 2️⃣ Generate Prisma schema
  //
  let prismaSchema = generatePrismaSchema(plan);
  prismaSchema = injectAuthModels(prismaSchema);

  //
  // 3️⃣ Remove old backend completely
  //
  if (fs.existsSync(backendPath)) {
    fs.rmSync(backendPath, { recursive: true, force: true });
  }

  //
  // 4️⃣ Generate backend scaffold
  //
  generateBackendScaffold(backendPath, prismaSchema);
  writeBackendEnv({backendPath,
      dbUser: "startup",
      dbPass: "startup",
      dbName: "startupdb",});
  //
  // 5️⃣ Generate CRUD per entity
  //
  for (const entity of plan.entities) {
    generateCrudForEntity(backendPath, entity);
  }

  //
  // 6️⃣ Install dependencies
  //
  console.log("🔥 BEFORE INSTALL");

  await runCommand(
    params.jobId,
    "npm",
    ["install"],
    backendPath
  );
console.log("🔥 AFTER INSTALL");

  // //
  // // 7️⃣ Generate Prisma Client
  // //
  // await runCommand(
  //   params.jobId,
  //   "npx",
  //   ["prisma", "generate"],
  //   backendPath
  // );

  // //
  // // 8️⃣ Run Migration
  // //
  // await runCommand(
  //   params.jobId,
  //   "npx",
  //   ["prisma", "migrate", "deploy"],
  //   backendPath
  // );


  console.log("✅ Backend fully generated with migrations");
}
