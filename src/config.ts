import { readFileSync } from "fs";
import { join } from "path";
import { getAgentDir } from "@earendil-works/pi-coding-agent";

export function resolveModel(modelString: string): { provider: string; id: string } {
  const [provider, id] = modelString.split("/");
  return { provider, id };
}

export function readUserFlows(): unknown {
  try {
    const settingsPath = join(getAgentDir(), "settings.json");
    const settings = JSON.parse(readFileSync(settingsPath, "utf-8")) as {
      "pi-flow"?: { flows?: unknown };
    };
    return settings["pi-flow"]?.flows;
  } catch {
    return undefined;
  }
}
