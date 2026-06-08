export interface PipelineStage {
  id: string;
  skillName: string | null;
  skillPath?: string;
  modelType: "design" | "code";
  gate: "auto" | "pause";
  completionSignals: string[];
}

export interface PipelineDefinition {
  id: string;
  name: string;
  description: string;
  stages: PipelineStage[];
}

export const PIPELINES: PipelineDefinition[] = [
  {
    id: "new-feature",
    name: "New Feature",
    description: "Grill → PRD → Issues → TDD",
    stages: [
      {
        id: "grill",
        skillName: "grill-with-docs",
        modelType: "design",
        gate: "pause",
        completionSignals: [
          "all questions resolved",
          "shared understanding reached",
          "design is ready",
        ],
      },
      {
        id: "prd",
        skillName: "to-prd",
        modelType: "design",
        gate: "auto",
        completionSignals: ["PRD created", "published to", "spec written"],
      },
      {
        id: "issues",
        skillName: "to-issues",
        modelType: "design",
        gate: "pause",
        completionSignals: [
          "issues created",
          "breakdown complete",
          "ready for implementation",
        ],
      },
      {
        id: "tdd",
        skillName: "tdd",
        modelType: "code",
        gate: "auto",
        completionSignals: [
          "all tests passing",
          "implementation complete",
          "red-green-refactor done",
        ],
      },
    ],
  },
  {
    id: "improve-arch",
    name: "Improve Architecture",
    description: "Architecture review → Choose → PRD → Issues → TDD",
    stages: [
      {
        id: "arch-review",
        skillName: "improve-codebase-architecture",
        modelType: "design",
        gate: "pause",
        completionSignals: [
          "refactoring opportunities identified",
          "architecture review complete",
          "consolidation plan ready",
        ],
      },
      {
        id: "choose",
        skillName: null,
        modelType: "design",
        gate: "pause",
        completionSignals: ["selected", "chose", "proceeding with"],
      },
      {
        id: "prd",
        skillName: "to-prd",
        modelType: "design",
        gate: "auto",
        completionSignals: ["PRD created", "published to"],
      },
      {
        id: "issues",
        skillName: "to-issues",
        modelType: "design",
        gate: "pause",
        completionSignals: ["issues created", "breakdown complete"],
      },
      {
        id: "tdd",
        skillName: "tdd",
        modelType: "code",
        gate: "auto",
        completionSignals: ["all tests passing", "implementation complete"],
      },
    ],
  },
  {
    id: "debug",
    name: "Debug",
    description: "Diagnose → PRD → Issues → TDD",
    stages: [
      {
        id: "diagnose",
        skillName: "diagnose",
        modelType: "design",
        gate: "pause",
        completionSignals: [
          "root cause identified",
          "fix proposed",
          "diagnosis complete",
        ],
      },
      {
        id: "prd",
        skillName: "to-prd",
        modelType: "design",
        gate: "auto",
        completionSignals: ["PRD created", "published to"],
      },
      {
        id: "issues",
        skillName: "to-issues",
        modelType: "design",
        gate: "pause",
        completionSignals: ["issues created", "breakdown complete"],
      },
      {
        id: "tdd",
        skillName: "tdd",
        modelType: "code",
        gate: "auto",
        completionSignals: ["all tests passing", "implementation complete"],
      },
    ],
  },
];

export function findPipeline(id: string): PipelineDefinition | undefined {
  return PIPELINES.find((p) => p.id === id);
}
