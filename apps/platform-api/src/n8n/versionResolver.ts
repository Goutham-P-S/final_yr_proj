import path from "path";
import { StartupVersions } from "../types";
import { Planner, WorkflowBuilder } from "./contracts";

export type ResolvedVersions = {
  planner: Planner;
  builder: WorkflowBuilder;
  irVersion: string;
};

export async function resolveVersions(params: {
  versions: StartupVersions;
}): Promise<ResolvedVersions> {
  const { versions } = params;

  // --- Resolve planner ---
  const plannerModulePath = path.join(
    __dirname,
    "planner",
    versions.planner,
    "index"
  );

  // --- Resolve builder ---
  const builderModulePath = path.join(
    __dirname,
    "builder",
    versions.builder,
    "index"
  );

  let plannerMod: any;
  let builderMod: any;

  try {
    plannerMod = await import(plannerModulePath);
  } catch (err) {
    throw new Error(`Planner version not found: ${versions.planner}`);
  }

  try {
    builderMod = await import(builderModulePath);
  } catch (err) {
    throw new Error(`Builder version not found: ${versions.builder}`);
  }

  if (!plannerMod.default) {
    throw new Error(`Planner ${versions.planner} has no default export`);
  }

  if (!builderMod.default) {
    throw new Error(`Builder ${versions.builder} has no default export`);
  }

  return {
    planner: plannerMod.default as Planner,
    builder: builderMod.default as WorkflowBuilder,
    irVersion: versions.workflowIR,
  };
}
