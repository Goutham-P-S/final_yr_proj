export type SandboxPorts = {
  webPort: number;
  dbPort: number;
  n8nPort: number;
};

export type StartupCreateRequest = {
  name: string;
  slug?: string;
};
