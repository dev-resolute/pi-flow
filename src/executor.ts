import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { PipelineDefinition, PipelineStage } from "./pipelines.js";
import { findPipeline } from "./pipelines.js";
import type { PipelineState } from "./state.js";
import { getState, setState } from "./state.js";
import { getConfig, resolveModel } from "./config.js";
import { renderWidget, clearWidget } from "./widget.js";
import { detectCompletion } from "./detector.js";

export function transitionToStage(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  pipeline: PipelineDefinition,
  state: PipelineState,
): void {
  const stage = pipeline.stages[state.stageIndex];

  // Switch model
  const config = getConfig(pi);
  const modelRef = resolveModel(config, stage.modelType);
  const model = ctx.modelRegistry?.find(modelRef.provider, modelRef.id);
  if (model) {
    pi.setModel(model).then((success) => {
      if (!success) {
        ctx.ui.notify(
          `Failed to switch to ${modelRef.provider}/${modelRef.id}: no API key available`,
          "warning"
        );
      }
    });
  } else {
    ctx.ui.notify(
      `Model ${modelRef.provider}/${modelRef.id} not found in registry. Run /pi-flow:setup to configure.`,
      "warning"
    );
  }

  // Send transition prompt
  const prompt = buildTransitionPrompt(stage, state);
  pi.sendUserMessage(prompt);

  // Update widget
  renderWidget(ctx, pipeline, state);
}

export function advanceStage(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  pipeline: PipelineDefinition,
  currentState: PipelineState,
): void {
  const nextStageIndex = currentState.stageIndex + 1;

  if (nextStageIndex >= pipeline.stages.length) {
    // Pipeline complete
    const completedState: PipelineState = {
      ...currentState,
      phase: "complete",
    };
    setState(completedState);
    pi.appendEntry("pi-flow-state", completedState);
    clearWidget(ctx);
    ctx.ui.notify("Pipeline complete!", "info");
    return;
  }

  const nextState: PipelineState = {
    ...currentState,
    stageIndex: nextStageIndex,
  };

  setState(nextState);
  pi.appendEntry("pi-flow-state", nextState);
  transitionToStage(pi, ctx, pipeline, nextState);
}

export function handleStageCompletion(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  pipeline: PipelineDefinition,
  state: PipelineState,
  agentMessage: string,
): void {
  const stage = pipeline.stages[state.stageIndex];
  const result = detectCompletion(agentMessage, stage.id, state.pipelineId);

  if (!result.complete) return;

  if (stage.gate === "auto") {
    advanceStage(pi, ctx, pipeline, state);
  } else {
    // Pause at gate
    const gatedState: PipelineState = {
      ...state,
      phase: "gated",
    };
    setState(gatedState);
    pi.appendEntry("pi-flow-state", gatedState);
    const nextStage = pipeline.stages[state.stageIndex + 1];
    ctx.ui.notify(
      `Stage "${stage.id}" complete. Run /pi-flow:next to continue to ${nextStage?.id ?? "completion"}.`,
      "info"
    );
  }
}

function buildTransitionPrompt(stage: PipelineStage, state: PipelineState): string {
  const prompts: Record<string, string> = {
    grill: `Start grilling the design for: ${state.topic}. Use grill-with-docs to interview about the feature, explore edge cases, and establish shared understanding.`,
    prd: `Convert the design decisions into a PRD. Reference any context established during the grilling session.`,
    issues: `Break the PRD into independently-grabbable implementation issues using vertical slices (tracer bullets).`,
    tdd: `Begin TDD implementation. Start with the first issue — write a failing test, then the minimal code to pass.`,
  };

  return prompts[stage.id] ?? `Executing stage: ${stage.id}`;
}
