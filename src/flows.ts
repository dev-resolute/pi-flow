export type StageMode = "HITL" | "AFK";

export interface FlowStage {
  skill: string;
  model?: string;
  mode: StageMode;
}

export interface FlowDefinition {
  description?: string;
  stages: FlowStage[];
}

interface RawStage {
  skill?: unknown;
  model?: unknown;
  mode?: unknown;
}

interface RawFlow {
  description?: unknown;
  stages?: unknown;
}

const PLAN_TO_CODE: FlowStage[] = [
  { skill: "to-prd", mode: "AFK" },
  { skill: "to-issues", mode: "HITL" },
  { skill: "tdd", mode: "AFK" },
];

export const BUILTIN_FLOWS: Record<string, FlowDefinition> = {
  "new-feature": {
    description: "Grill → PRD → Issues → TDD",
    stages: [{ skill: "grill-with-docs", mode: "HITL" }, ...PLAN_TO_CODE],
  },
  "improve-arch": {
    description: "Architecture review → PRD → Issues → TDD",
    stages: [{ skill: "improve-codebase-architecture", mode: "HITL" }, ...PLAN_TO_CODE],
  },
  debug: {
    description: "Diagnose → PRD → Issues → TDD",
    stages: [{ skill: "diagnose", mode: "HITL" }, ...PLAN_TO_CODE],
  },
};

export function resolveFlows(rawFlows: unknown): Record<string, FlowDefinition> {
  const result: Record<string, FlowDefinition> = {};
  const flows = (rawFlows ?? {}) as Record<string, RawFlow>;

  for (const [name, def] of Object.entries(flows)) {
    const rawStages = Array.isArray(def.stages) ? (def.stages as RawStage[]) : [];
    if (rawStages.length === 0) {
      throw new Error(`Flow "${name}" has no stages`);
    }

    result[name] = {
      description: typeof def.description === "string" ? def.description : undefined,
      stages: rawStages.map((stage, index) => resolveStage(name, index, stage)),
    };
  }

  return result;
}

function resolveStage(flowName: string, index: number, stage: RawStage): FlowStage {
  if (typeof stage.skill !== "string" || stage.skill.length === 0) {
    throw new Error(`Flow "${flowName}" stage ${index + 1} is missing a skill`);
  }

  if (stage.mode !== undefined && stage.mode !== "HITL" && stage.mode !== "AFK") {
    throw new Error(
      `Flow "${flowName}" stage ${index + 1} has invalid mode "${String(stage.mode)}" (expected HITL or AFK)`,
    );
  }

  return {
    skill: stage.skill,
    model: typeof stage.model === "string" ? stage.model : undefined,
    mode: stage.mode === "AFK" ? "AFK" : "HITL",
  };
}
