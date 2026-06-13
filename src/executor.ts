import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { FlowDefinition, FlowStage } from "./flows.js";
import type { FlowState } from "./state.js";
import { setState } from "./state.js";
import { resolveModel } from "./config.js";
import { renderWidget, clearWidget } from "./widget.js";
import { hasAntiSignal } from "./detector.js";

export const STATE_ENTRY = "pi-flow-state";

export function transitionToStage(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  flow: FlowDefinition,
  state: FlowState,
): void {
  const stage = flow.stages[state.stageIndex];
  if (!applyModel(pi, ctx, stage, state)) return;
  pi.sendUserMessage(buildKickoff(stage, state));
  renderWidget(ctx, flow, state);
}

export function validateModels(ctx: ExtensionContext, flow: FlowDefinition): string[] {
  const errors: string[] = [];
  for (const stage of flow.stages) {
    if (stage.model === undefined) continue;
    const { provider, id } = resolveModel(stage.model);
    if (!ctx.modelRegistry?.find(provider, id)) {
      errors.push(`stage "${stage.skill}": model "${stage.model}" is not available`);
    }
  }
  return errors;
}

export function advanceStage(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  flow: FlowDefinition,
  state: FlowState,
): void {
  const nextIndex = state.stageIndex + 1;

  if (nextIndex >= flow.stages.length) {
    persist(pi, { ...state, phase: "complete" });
    clearWidget(ctx);
    ctx.ui.notify(`Flow "${state.flowId}" complete.`, "info");
    return;
  }

  const next = persist(pi, { ...state, stageIndex: nextIndex, phase: "running" });
  transitionToStage(pi, ctx, flow, next);
}

export function handleAgentEnd(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  flow: FlowDefinition,
  state: FlowState,
  finalMessage: string,
): void {
  if (state.phase !== "running") return;

  const stage = flow.stages[state.stageIndex];
  if (stage.mode !== "AFK") return;

  if (hasAntiSignal(finalMessage)) {
    persist(pi, { ...state, phase: "gated" });
    ctx.ui.notify(
      `Stage "${stage.skill}" paused — it reported it is not done. Run /pi-flow:next to continue or /pi-flow:skip to move on.`,
      "info",
    );
    return;
  }

  advanceStage(pi, ctx, flow, state);
}

function persist(pi: ExtensionAPI, state: FlowState): FlowState {
  setState(state);
  pi.appendEntry(STATE_ENTRY, state);
  return state;
}

function applyModel(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  stage: FlowStage,
  state: FlowState,
): boolean {
  if (stage.model === undefined) return true;

  const { provider, id } = resolveModel(stage.model);
  const model = ctx.modelRegistry?.find(provider, id);
  if (!model) {
    haltFailure(pi, ctx, state, `Stage "${stage.skill}" cannot start: model "${stage.model}" is not available.`);
    return false;
  }

  void pi.setModel(model).then((ok) => {
    if (!ok) {
      haltFailure(
        pi,
        ctx,
        state,
        `Stage "${stage.skill}" could not switch to "${stage.model}" (no API key?). Flow paused.`,
      );
    }
  });
  return true;
}

function haltFailure(pi: ExtensionAPI, ctx: ExtensionContext, state: FlowState, message: string): void {
  persist(pi, { ...state, phase: "gated" });
  ctx.ui.notify(message, "error");
}

function buildKickoff(stage: FlowStage, state: FlowState): string {
  if (state.stageIndex === 0) {
    return `Use the ${stage.skill} skill. Topic: ${state.input}`;
  }
  return `Continue with the ${stage.skill} skill, building on what this session has produced so far.`;
}
