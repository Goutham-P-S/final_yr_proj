export type SandboxPorts = {
  webPort: number;
  dbPort: number;
  n8nPort: number;
};

export type StartupCreateRequest = {
  name: string;
  slug?: string;
};

export type VersionTag = `v${number}`

export interface StartupVersions {
  infra: VersionTag
  planner: VersionTag
  workflowIR: VersionTag
  builder: VersionTag
}

export interface StartupRecord {
  sandboxName: string
  createdAt: string
  ports: {
    n8n: number
    web?: number
  }
  versions: StartupVersions
}
