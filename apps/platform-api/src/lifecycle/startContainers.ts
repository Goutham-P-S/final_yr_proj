import { dockerComposeUp } from "../dockerRunner";

export function startContainers(startup: any) {
  dockerComposeUp(startup.sandboxPath, startup.sandboxName);
}
