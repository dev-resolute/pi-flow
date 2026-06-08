import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export interface PiFlowConfig {
  models: {
    design: string;
    code: string;
  };
}

export function getConfig(_pi: ExtensionAPI): PiFlowConfig {
  return {
    models: {
      design: "opencode-go/qwen3.7-max",
      code: "opencode-go/kimi-k2.6",
    },
  };
}

export function resolveModel(config: PiFlowConfig, modelType: "design" | "code"): { provider: string; id: string } {
  const modelString = config.models[modelType];
  const [provider, id] = modelString.split("/");
  return { provider, id };
}
