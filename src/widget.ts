import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { PipelineDefinition, PipelineState } from "./pipelines.js";

export function renderWidget(
  ctx: ExtensionContext,
  pipeline: PipelineDefinition,
  state: PipelineState,
): void {
  const stage = pipeline.stages[state.stageIndex];
  const stageNum = state.stageIndex + 1;
  const totalStages = pipeline.stages.length;
  const status = state.phase === "complete" ? "complete" : `${stageNum}/${totalStages}: ${stage.id}`;

  ctx.ui.setWidget("pi-flow", [
    `[pi-flow] ${pipeline.name} │ stage ${status}`,
  ]);
}

export function clearWidget(ctx: ExtensionContext): void {
  ctx.ui.setWidget("pi-flow", undefined);
}
