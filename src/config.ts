import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { BUILTIN_FLOWS } from "./flows.js";

export function resolveModel(modelString: string): { provider: string; id: string } {
  const [provider, id] = modelString.split("/");
  return { provider, id };
}

export function flowsPath(): string {
  return join(getAgentDir(), "pi-flow.json");
}

export function readUserFlows(): unknown {
  try {
    const data = JSON.parse(readFileSync(flowsPath(), "utf-8")) as { flows?: unknown };
    return data.flows;
  } catch {
    return undefined;
  }
}

export interface SeedResult {
  written: boolean;
  path: string;
}

export function seedBuiltins(): SeedResult {
  const path = flowsPath();
  const existing = readUserFlows();
  if (existing && typeof existing === "object" && Object.keys(existing as object).length > 0) {
    return { written: false, path };
  }
  writeFileSync(path, `${JSON.stringify({ flows: BUILTIN_FLOWS }, null, 2)}\n`);
  return { written: true, path };
}
