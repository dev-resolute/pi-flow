import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { FlowDefinition } from "./flows.js";
import type { FlowState } from "./state.js";

const WIDGET_KEY = "pi-flow";

export function renderWidget(ctx: ExtensionContext, flow: FlowDefinition, state: FlowState): void {
  const stageNum = state.stageIndex + 1;
  const total = flow.stages.length;
  const stage = flow.stages[state.stageIndex];

  ctx.ui.setWidget(WIDGET_KEY, [
    `[pi-flow] ${state.flowId} │ stage ${stageNum}/${total}: ${stage.skill} (${stage.mode})`,
  ]);
}

export function renderIdleWidget(ctx: ExtensionContext, flowNames: string[]): void {
  const summary = flowNames.length === 1 ? "1 flow" : `${flowNames.length} flows`;
  ctx.ui.setWidget(WIDGET_KEY, [`[pi-flow] ${summary} · /pi-flow:run to start`]);
}

export function clearWidget(ctx: ExtensionContext): void {
  ctx.ui.setWidget(WIDGET_KEY, undefined);
}
