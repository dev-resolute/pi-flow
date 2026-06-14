import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { resolveFlows, type FlowDefinition, type StageMode } from "./flows.js";
import { getState, setState, type FlowState, type FlowPhase } from "./state.js";
import { STATE_ENTRY, transitionToStage, advanceStage, validateModels } from "./executor.js";
import { clearWidget } from "./widget.js";
import type { SeedResult } from "./config.js";

export interface PiFlowDeps {
  loadRawFlows: () => unknown;
  seedBuiltins: () => SeedResult;
}

const FLOW_SCHEMA_HELP = [
  "pi-flow — flows live in ~/.pi/agent/pi-flow.json:",
  "",
  '{ "flows": {',
  '    "<name>": {',
  '      "description": "<optional>",',
  '      "stages": [',
  '        { "skill": "<skill>", "model": "<provider/id, optional>", "mode": "HITL | AFK" }',
  "      ]",
  "    }",
  "} }",
  "",
  "mode: HITL pauses for you after the skill; AFK auto-advances. model is optional (keeps the current model).",
  "Run /pi-flow:setup to write the three built-in flows into the file.",
].join("\n");

export function registerCommands(pi: ExtensionAPI, deps: PiFlowDeps): void {
  function loadFlows(ctx: ExtensionContext): Record<string, FlowDefinition> | null {
    try {
      return resolveFlows(deps.loadRawFlows());
    } catch (err) {
      ctx.ui.notify(`Invalid pi-flow config: ${(err as Error).message}`, "error");
      return null;
    }
  }

  function completeFlowName(prefix: string) {
    let flows: Record<string, FlowDefinition>;
    try {
      flows = resolveFlows(deps.loadRawFlows());
    } catch {
      return null;
    }
    return Object.entries(flows)
      .filter(([name]) => name.startsWith(prefix))
      .map(([name, def]) => ({ value: name, label: name, description: def.description ?? "" }));
  }

  pi.registerCommand("pi-flow:run", {
    description: "Start a flow by name",
    getArgumentCompletions: completeFlowName,
    handler: (args: string, ctx: ExtensionContext) => {
      const flows = loadFlows(ctx);
      if (!flows) return;
      runFlow(pi, ctx, flows, args);
    },
  });

  pi.registerCommand("pi-flow:setup", {
    description: "Write the built-in flows to ~/.pi/agent/pi-flow.json",
    handler: (args: string, ctx: ExtensionContext) => {
      const result = deps.seedBuiltins();
      if (result.written) {
        ctx.ui.notify(
          `Wrote the built-in flows to ${result.path}. Run /pi-flow:status to see them.`,
          "info",
        );
      } else {
        ctx.ui.notify(
          `${result.path} already has flows — left untouched. Edit it directly, or see /pi-flow:help.`,
          "warning",
        );
      }
    },
  });

  pi.registerCommand("pi-flow:help", {
    description: "Show the pi-flow flow schema",
    handler: (args: string, ctx: ExtensionContext) => {
      ctx.ui.notify(FLOW_SCHEMA_HELP, "info");
    },
  });

  pi.registerCommand("pi-flow:next", {
    description: "Advance past a HITL stage",
    handler: (args: string, ctx: ExtensionContext) => {
      const flows = loadFlows(ctx);
      if (!flows) return;
      advancePastGate(pi, ctx, flows);
    },
  });

  pi.registerCommand("pi-flow:skip", {
    description: "Abandon the current stage and advance",
    handler: (args: string, ctx: ExtensionContext) => {
      const flows = loadFlows(ctx);
      if (!flows) return;
      const found = activeFlow(ctx, flows);
      if (found) advanceStage(pi, ctx, found.flow, found.state);
    },
  });

  pi.registerCommand("pi-flow:retry", {
    description: "Re-run the current stage",
    handler: (args: string, ctx: ExtensionContext) => {
      const flows = loadFlows(ctx);
      if (!flows) return;
      const found = activeFlow(ctx, flows);
      if (found) transitionToStage(pi, ctx, found.flow, found.state);
    },
  });

  pi.registerCommand("pi-flow:status", {
    description: "Show pi-flow status and catalog",
    handler: (args: string, ctx: ExtensionContext) => {
      const flows = loadFlows(ctx);
      if (!flows) return;
      ctx.ui.notify(statusLine(flows), "info");
    },
  });

  pi.registerCommand("pi-flow:cancel", {
    description: "Cancel the active flow",
    handler: (args: string, ctx: ExtensionContext) => {
      const state = activeState();
      if (!state) {
        ctx.ui.notify("No active flow.", "error");
        return;
      }
      const cancelled: FlowState = { ...state, phase: "idle" };
      setState(cancelled);
      pi.appendEntry(STATE_ENTRY, cancelled);
      clearWidget(ctx);
      ctx.ui.notify(`Flow "${state.flowId}" cancelled.`, "info");
    },
  });
}

function activeFlow(
  ctx: ExtensionContext,
  flows: Record<string, FlowDefinition>,
): { flow: FlowDefinition; state: FlowState } | null {
  const state = activeState();
  if (!state) {
    ctx.ui.notify("No active flow. Start one with /pi-flow:run <name>.", "error");
    return null;
  }
  const flow = flows[state.flowId];
  if (!flow) {
    ctx.ui.notify(`Flow "${state.flowId}" not found.`, "error");
    return null;
  }
  return { flow, state };
}

function advancePastGate(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  flows: Record<string, FlowDefinition>,
): void {
  const found = activeFlow(ctx, flows);
  if (!found) return;
  const { flow, state } = found;

  const stage = flow.stages[state.stageIndex];
  if (state.phase === "running" && stage.mode === "AFK") {
    ctx.ui.notify(
      `Stage "${stage.skill}" is AFK — it advances on its own. Use /pi-flow:skip to force it.`,
      "info",
    );
    return;
  }

  advanceStage(pi, ctx, flow, state);
}

function activeState(): FlowState | null {
  const state = getState();
  if (!state || state.phase === "idle" || state.phase === "complete") return null;
  return state;
}

function statusLine(flows: Record<string, FlowDefinition>): string {
  const state = activeState();
  if (!state) {
    const names = Object.keys(flows);
    return names.length > 0
      ? `pi-flow flows: ${names.join(", ")}`
      : "No flows yet. Run /pi-flow:setup to add the built-ins, or create ~/.pi/agent/pi-flow.json (see /pi-flow:help).";
  }

  const flow = flows[state.flowId];
  if (!flow) return `Flow "${state.flowId}" not found.`;

  const stage = flow.stages[state.stageIndex];
  const controls = controlsFor(stage.mode, state.phase).join(", ");
  return `${state.flowId} │ stage ${state.stageIndex + 1}/${flow.stages.length}: ${stage.skill} (${stage.mode}) │ ${state.phase} │ ${controls}`;
}

function controlsFor(mode: StageMode, phase: FlowPhase): string[] {
  const controls: string[] = [];
  if (phase === "gated" || mode === "HITL") controls.push("next");
  controls.push("skip", "retry", "cancel");
  return controls;
}

function runFlow(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  flows: Record<string, FlowDefinition>,
  args: string,
): void {
  const trimmed = args.trim();
  const spaceIndex = trimmed.indexOf(" ");
  const flowId = spaceIndex === -1 ? trimmed : trimmed.slice(0, spaceIndex);
  const input = spaceIndex === -1 ? "" : trimmed.slice(spaceIndex + 1).trim();

  const active = getState();
  if (active && active.phase !== "idle" && active.phase !== "complete") {
    ctx.ui.notify(
      `Flow "${active.flowId}" is active. Cancel it first with /pi-flow:cancel.`,
      "warning",
    );
    return;
  }

  const flow = flows[flowId];
  if (!flow) {
    ctx.ui.notify(`Flow "${flowId}" not found. Run /pi-flow:status to see available flows.`, "error");
    return;
  }

  const modelErrors = validateModels(ctx, flow);
  if (modelErrors.length > 0) {
    ctx.ui.notify(`Cannot start "${flowId}": ${modelErrors.join("; ")}.`, "error");
    return;
  }

  const state: FlowState = {
    flowId,
    stageIndex: 0,
    phase: "running",
    input,
    startedAt: Date.now(),
  };
  setState(state);
  pi.appendEntry(STATE_ENTRY, state);
  transitionToStage(pi, ctx, flow, state);
}
