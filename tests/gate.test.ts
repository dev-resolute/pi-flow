import { describe, test, expect, beforeEach } from "vitest";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { handleStageCompletion, advanceStage } from "../src/executor.js";
import { getState, setState, resetState, type PipelineState } from "../src/state.js";

function createMockPi(): {
  api: ExtensionAPI;
  calls: {
    messages: string[];
    entries: Array<{ type: string; data: unknown }>;
    notifications: Array<{ text: string; type: string }>;
  };
} {
  const calls = {
    messages: [] as string[],
    entries: [] as Array<{ type: string; data: unknown }>,
    notifications: [] as Array<{ text: string; type: string }>,
  };

  const api = {
    sendUserMessage: (content: string) => {
      calls.messages.push(content);
    },
    appendEntry: (type: string, data: unknown) => {
      calls.entries.push({ type, data });
    },
    setModel: () => Promise.resolve(true),

  } as unknown as ExtensionAPI;

  return { api, calls };
}

function createMockCtx(calls: { notifications: Array<{ text: string; type: string }> }): ExtensionContext {
  return {
    ui: {
      notify: (text: string, type: string) => {
        calls.notifications.push({ text, type });
      },
      setWidget: () => {},
    },
    modelRegistry: {
      find: () => ({ provider: "test", id: "test" }),
      list: () => [],
    },
  } as unknown as ExtensionContext;
}

describe("gate behavior", () => {
  beforeEach(() => {
    resetState();
  });

  test("auto gate advances to next stage on completion", () => {
    const { api, calls } = createMockPi();
    const ctx = createMockCtx(calls);

    const state: PipelineState = {
      pipelineId: "new-feature",
      stageIndex: 1, // prd stage (auto gate)
      phase: "running",
      topic: "test",
      artifacts: {},
      startedAt: Date.now(),
    };
    setState(state);

    // Mock pipeline lookup by requiring the module
    handleStageCompletion(api, ctx, {
      id: "new-feature",
      name: "New Feature",
      description: "test",
      stages: [
        { id: "grill", skillName: "grill", modelType: "design", gate: "pause", completionSignals: [] },
        { id: "prd", skillName: "prd", modelType: "design", gate: "auto", completionSignals: ["PRD created"] },
        { id: "issues", skillName: "issues", modelType: "design", gate: "pause", completionSignals: [] },
      ],
    } as any, state, "The PRD has been created.");

    const nextState = getState();
    expect(nextState?.stageIndex).toBe(2);
    expect(nextState?.phase).toBe("running");
    expect(calls.messages).toHaveLength(1); // transition prompt sent
  });

  test("pause gate sets phase to gated on completion", () => {
    const { api, calls } = createMockPi();
    const ctx = createMockCtx(calls);

    const state: PipelineState = {
      pipelineId: "new-feature",
      stageIndex: 0, // grill stage (pause gate)
      phase: "running",
      topic: "test",
      artifacts: {},
      startedAt: Date.now(),
    };
    setState(state);

    handleStageCompletion(api, ctx, {
      id: "new-feature",
      name: "New Feature",
      description: "test",
      stages: [
        { id: "grill", skillName: "grill", modelType: "design", gate: "pause", completionSignals: ["resolved"] },
        { id: "prd", skillName: "prd", modelType: "design", gate: "auto", completionSignals: [] },
      ],
    } as any, state, "All questions resolved.");

    const nextState = getState();
    expect(nextState?.stageIndex).toBe(0); // didn't advance
    expect(nextState?.phase).toBe("gated"); // paused at gate
    expect(calls.notifications[0].text).toContain("Run /pi-flow:next");
  });
});
