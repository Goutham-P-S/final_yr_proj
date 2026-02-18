import path from "path";
import { allocatePorts } from "../portAllocator";
import { createSandboxFolder, slugify } from "../sandboxManager";
import { addStartup } from "../startupStore";
import { DEFAULT_STARTUP_VERSIONS } from "../versionDefaults";

export function createStartupFromPrompt(prompt: string) {
  const slug = slugify(prompt.slice(0, 30));
  const { id, ports } = allocatePorts();

  const repoRoot = path.resolve(process.cwd(), "..", "..");

  const created = createSandboxFolder({
    repoRoot,
    startupId: id,
    slug,
    ports,
    versions: DEFAULT_STARTUP_VERSIONS
  });

  const record = {
    startupId: id,
    slug,
    ports,
    sandboxName: created.sandboxName,
    sandboxPath: created.sandboxPath,
    createdAt: new Date().toISOString(),
    versions: DEFAULT_STARTUP_VERSIONS
  };

  addStartup(record);

  return record;
}
