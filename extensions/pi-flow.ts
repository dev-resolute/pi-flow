import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { registerCommands, type PiFlowDeps } from "../src/commands.js";
import { readUserFlows, seedBuiltins } from "../src/config.js";
import { resolveFlows, type FlowDefinition } from "../src/flows.js";
import { getState, setState, type FlowState } from "../src/state.js";
import { handleAgentEnd, STATE_ENTRY } from "../src/executor.js";
import { renderIdleWidget, renderWidget } from "../src/widget.js";

export default function piFlowExtension(pi: ExtensionAPI, deps?: Partial<PiFlowDeps>): void {
  const resolved: PiFlowDeps = {
    loadRawFlows: deps?.loadRawFlows ?? readUserFlows,
    seedBuiltins: deps?.seedBuiltins ?? seedBuiltins,
  };

  registerCommands(pi, resolved);

  pi.on("session_start", (event, ctx) => {
    const flows = safeResolve(resolved);
    const restored = readPersistedState(ctx);

    if (restored && (restored.phase === "running" || restored.phase === "gated")) {
      const flow = flows[restored.flowId];
      if (!flow) {
        setState(null);
        ctx.ui.notify(
          `Previous flow "${restored.flowId}" is no longer defined; it has been cleared.`,
          "warning",
        );
        renderIdleWidget(ctx, Object.keys(flows));
        return;
      }

      setState(restored);
      ctx.ui.notify(
        `Flow "${restored.flowId}" restored at stage ${restored.stageIndex + 1}. Run /pi-flow:next to continue or /pi-flow:cancel.`,
        "info",
      );
      renderWidget(ctx, flow, restored);
      return;
    }

    renderIdleWidget(ctx, Object.keys(flows));
  });

  pi.on("agent_end", (event, ctx) => {
    const state = getState();
    if (!state || state.phase !== "running") return;

    const flow = safeResolve(resolved)[state.flowId];
    if (!flow) return;

    handleAgentEnd(pi, ctx, flow, state, finalAssistantText(event));
  });
}

function safeResolve(deps: PiFlowDeps): Record<string, FlowDefinition> {
  try {
    return resolveFlows(deps.loadRawFlows());
  } catch {
    return {};
  }
}

function readPersistedState(ctx: ExtensionContext): FlowState | null {
  const sessionManager = (ctx as { sessionManager?: { getBranch?: () => unknown[] } }).sessionManager;
  const entries = sessionManager?.getBranch?.() ?? [];

  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i] as { type?: string; customType?: string; data?: unknown };
    if (entry && entry.type === "custom" && entry.customType === STATE_ENTRY) {
      return entry.data as FlowState;
    }
  }

  return null;
}

function finalAssistantText(event: { messages?: unknown }): string {
  const messages = event.messages;
  if (!Array.isArray(messages) || messages.length === 0) return "";
  return contentToText((messages[messages.length - 1] as { content?: unknown }).content);
}

function contentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        typeof part === "object" && part !== null && "text" in part
          ? String((part as { text: unknown }).text)
          : "",
      )
      .join(" ");
  }
  return "";
}
