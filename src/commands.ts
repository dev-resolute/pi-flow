import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { findPipeline, type PipelineDefinition } from "./pipelines.js";
import { getState, setState, type PipelineState } from "./state.js";
import { clearWidget } from "./widget.js";
import { transitionToStage, advanceStage } from "./executor.js";

function guardNoPipeline(ctx: ExtensionContext): PipelineState | null {
  const state = getState();
  if (!state) {
    ctx.ui.notify("No active pipeline. Start one with /pi-flow:new-feature <topic>", "error");
  }
  return state;
}

function requirePipeline(ctx: ExtensionContext, state: PipelineState): PipelineDefinition | null {
  const pipeline = findPipeline(state.pipelineId);
  if (!pipeline) {
    ctx.ui.notify(`Pipeline "${state.pipelineId}" not found`, "error");
  }
  return pipeline;
}

function startPipeline(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  pipelineId: string,
  topic: string,
): void {
  const currentState = getState();
  if (currentState && currentState.phase !== "idle" && currentState.phase !== "complete") {
    ctx.ui.notify(
      `Pipeline "${currentState.pipelineId}" is already active (stage ${currentState.stageIndex + 1}). Cancel it first with /pi-flow:cancel.`,
      "warning"
    );
    return;
  }

  const pipeline = findPipeline(pipelineId);
  if (!pipeline) {
    ctx.ui.notify(`Pipeline "${pipelineId}" not found`, "error");
    return;
  }

  const state: PipelineState = {
    pipelineId: pipeline.id,
    stageIndex: 0,
    phase: "running",
    topic,
    artifacts: {},
    startedAt: Date.now(),
  };

  setState(state);
  pi.appendEntry("pi-flow-state", state);
  transitionToStage(pi, ctx, pipeline, state);
}

export function registerCommands(pi: ExtensionAPI): void {
  pi.registerCommand("pi-flow:new-feature", {
    description: "Start a new-feature pipeline",
    handler: (args: string, ctx: ExtensionContext) => {
      startPipeline(pi, ctx, "new-feature", args);
    },
  });

  pi.registerCommand("pi-flow:improve-arch", {
    description: "Start an improve-architecture pipeline",
    handler: (args: string, ctx: ExtensionContext) => {
      startPipeline(pi, ctx, "improve-arch", args);
    },
  });

  pi.registerCommand("pi-flow:debug", {
    description: "Start a debug pipeline",
    handler: (args: string, ctx: ExtensionContext) => {
      startPipeline(pi, ctx, "debug", args);
    },
  });

  pi.registerCommand("pi-flow:next", {
    description: "Advance to the next stage",
    handler: (args: string, ctx: ExtensionContext) => {
      const state = guardNoPipeline(ctx);
      if (!state) return;

      const pipeline = requirePipeline(ctx, state);
      if (!pipeline) return;

      advanceStage(pi, ctx, pipeline, state);
    },
  });

  pi.registerCommand("pi-flow:cancel", {
    description: "Cancel the active pipeline",
    handler: (args: string, ctx: ExtensionContext) => {
      const state = guardNoPipeline(ctx);
      if (!state) return;

      const idleState: PipelineState = {
        ...state,
        phase: "idle",
      };
      setState(idleState);
      pi.appendEntry("pi-flow-state", idleState);
      clearWidget(ctx);
      ctx.ui.notify("Pipeline cancelled", "info");
    },
  });

  pi.registerCommand("pi-flow:skip", {
    description: "Force-advance to the next stage",
    handler: (args: string, ctx: ExtensionContext) => {
      const state = guardNoPipeline(ctx);
      if (!state) return;

      const pipeline = requirePipeline(ctx, state);
      if (!pipeline) return;

      advanceStage(pi, ctx, pipeline, state);
    },
  });

  pi.registerCommand("pi-flow:retry", {
    description: "Re-send the current stage transition prompt",
    handler: (args: string, ctx: ExtensionContext) => {
      const state = guardNoPipeline(ctx);
      if (!state) return;

      const pipeline = requirePipeline(ctx, state);
      if (!pipeline) return;

      transitionToStage(pi, ctx, pipeline, state);
    },
  });

  pi.registerCommand("pi-flow:setup", {
    description: "Configure pi-flow model mappings",
    handler: async (args: string, ctx: ExtensionContext) => {
      const models = ctx.modelRegistry.list();
      const designChoices = models.map((m) => `${m.provider}/${m.id}`);

      const designModel = await ctx.ui.select("Design model (for grill, prd, issues):", designChoices);
      if (!designModel) {
        ctx.ui.notify("Setup cancelled", "warning");
        return;
      }

      const codeChoices = models.map((m) => `${m.provider}/${m.id}`);
      const codeModel = await ctx.ui.select("Code model (for tdd):", codeChoices);
      if (!codeModel) {
        ctx.ui.notify("Setup cancelled", "warning");
        return;
      }

      ctx.ui.notify(
        `Add to your settings.json:\n\n"extensions": {\n  "pi-flow": {\n    "models": {\n      "design": "${designModel}",\n      "code": "${codeModel}"\n    }\n  }\n}`,
        "info"
      );
    },
  });

  pi.registerCommand("pi-flow:status", {
    description: "Show current pipeline status",
    handler: (args: string, ctx: ExtensionContext) => {
      const state = getState();
      if (!state) {
        ctx.ui.notify("No active pipeline", "info");
        return;
      }

      const pipeline = requirePipeline(ctx, state);
      if (!pipeline) return;

      const stage = pipeline.stages[state.stageIndex];
      const stageNum = state.stageIndex + 1;
      const totalStages = pipeline.stages.length;

      ctx.ui.notify(
        `${state.pipelineId} │ stage ${stageNum}/${totalStages}: ${stage.id} │ ${state.phase}`,
        "info"
      );
    },
  });
}
