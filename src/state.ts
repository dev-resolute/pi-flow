export interface PipelineState {
  pipelineId: string;
  stageIndex: number;
  phase: "running" | "gated" | "complete" | "idle";
  topic: string;
  artifacts: Record<string, string[]>;
  startedAt: number;
}

let currentState: PipelineState | null = null;

export function getState(): PipelineState | null {
  return currentState;
}

export function setState(state: PipelineState): void {
  currentState = state;
}

export function resetState(): void {
  currentState = null;
}
