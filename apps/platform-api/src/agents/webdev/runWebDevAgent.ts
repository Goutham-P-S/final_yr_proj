import path from "path";
import { execSync } from "child_process";
import fs from "fs";

import { planBackendArchitecture } from "./backendPlanner";
import { generatePrismaSchema } from "./prismaGenerator";
import { generateCrudForEntity } from "./crudGenerator";
import { generateBackendScaffold } from "./backendScaffoldGenerator";

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
}) {
  console.log("🧠 Web Dev Agent starting...");

  const backendPath = path.join(params.sandboxPath, "backend");

  //
  // 1️⃣ Plan backend
  //
  const plan = await planBackendArchitecture(params.requirement);

  //
  // 2️⃣ Generate Prisma schema
  //
  let prismaSchema = generatePrismaSchema(plan);
  prismaSchema = injectAuthModels(prismaSchema);

  //
  // 3️⃣ Remove old backend completely (clean regeneration)
  //
  if (fs.existsSync(backendPath)) {
    fs.rmSync(backendPath, { recursive: true, force: true });
  }

  //
  // 4️⃣ Generate full backend scaffold
  //
  generateBackendScaffold(backendPath, prismaSchema);

  //
  // 5️⃣ Generate CRUD per entity
  //
  for (const entity of plan.entities) {
    generateCrudForEntity(backendPath, entity);
  }

  //
  // 6️⃣ Install dependencies
  //
  console.log("📦 Installing backend dependencies...");
  execSync("npm install", {
    cwd: backendPath,
    stdio: "inherit"
  });

  //
  // 7️⃣ Run initial migration (ONLY ONCE)
  //
  console.log("⚙️ Running initial Prisma migration...");

  execSync("npx prisma generate", {
    cwd: backendPath,
    stdio: "inherit"
  });

  execSync("npx prisma migrate dev --name init", {
    cwd: backendPath,
    stdio: "inherit"
  });

  console.log("✅ Backend fully generated with migrations");
}
