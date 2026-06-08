import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerCommands } from "../src/commands.js";
import { setState } from "../src/state.js";

export default function piFlowExtension(pi: ExtensionAPI): void {
  registerCommands(pi);

  // Restore pipeline state on session start
  pi.on("session_start", async (_event, ctx) => {
    const entries = ctx.sessionManager.getBranch();
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      if (entry.type === "custom" && entry.customType === "pi-flow-state") {
        const state = entry.data as {
          pipelineId: string;
          stageIndex: number;
          phase: string;
          topic: string;
          artifacts: Record<string, string[]>;
          startedAt: number;
        };

        setState(state);

        if (state.phase === "gated") {
          ctx.ui.notify(
            `Pipeline paused at stage ${state.stageIndex + 1}. Type /pi-flow:next to continue.`,
            "info"
          );
        } else if (state.phase === "running") {
          ctx.ui.notify(
            `Pipeline active: ${state.pipelineId}, stage ${state.stageIndex + 1}`,
            "info"
          );
        }
        break;
      }
    }
  });
}
