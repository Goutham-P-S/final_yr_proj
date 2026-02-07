import fs from "fs";
import path from "path";
import { plannerTemplate, builderTemplate } from "./templates";

type Target = "planner" | "builder";

function ensureDir(p: string) {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
}

function scaffoldPlanner(version: string) {
  const baseDir = path.join(__dirname, "planner", version);

  if (fs.existsSync(baseDir)) {
    throw new Error(`Planner version ${version} already exists`);
  }

  ensureDir(baseDir);

  fs.writeFileSync(
    path.join(baseDir, "index.ts"),
    plannerTemplate(version),
    "utf8"
  );

  console.log(`✅ Planner ${version} scaffolded`);
}

function scaffoldBuilder(version: string) {
  const baseDir = path.join(__dirname, "builder", version);

  if (fs.existsSync(baseDir)) {
    throw new Error(`Builder version ${version} already exists`);
  }

  ensureDir(baseDir);

  fs.writeFileSync(
    path.join(baseDir, "index.ts"),
    builderTemplate(version),
    "utf8"
  );

  console.log(`✅ Builder ${version} scaffolded`);
}

function main() {
  const [, , target, version] = process.argv;

  if (!target || !version) {
    console.error("Usage: node scaffold.ts <planner|builder> <version>");
    process.exit(1);
  }

  if (target !== "planner" && target !== "builder") {
    console.error("Target must be 'planner' or 'builder'");
    process.exit(1);
  }

  if (!version.startsWith("v")) {
    console.error("Version must be like v1, v2, v3...");
    process.exit(1);
  }

  if (target === "planner") scaffoldPlanner(version);
  if (target === "builder") scaffoldBuilder(version);
}

main();
