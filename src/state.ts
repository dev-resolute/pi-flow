export type FlowPhase = "running" | "gated" | "complete" | "idle";

export interface FlowState {
  flowId: string;
  stageIndex: number;
  phase: FlowPhase;
  input: string;
  startedAt: number;
}

let currentState: FlowState | null = null;

export function getState(): FlowState | null {
  return currentState;
}

export function setState(state: FlowState | null): void {
  currentState = state;
}

export function resetState(): void {
  currentState = null;
}
