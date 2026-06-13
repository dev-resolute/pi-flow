import { describe, test, expect, beforeEach } from "vitest";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import piFlowExtension from "../extensions/pi-flow.js";
import { getState, resetState } from "../src/state.js";

const TEST_FLOWS = {
  "new-feature": {
    description: "Grill → TDD",
    stages: [
      { skill: "grill-with-docs", model: "opencode-go/qwen3.7-max", mode: "HITL" },
      { skill: "tdd", model: "opencode-go/kimi-k2.6", mode: "AFK" },
    ],
  },
  "all-afk": {
    description: "two autonomous stages",
    stages: [
      { skill: "diagnose", mode: "AFK" },
      { skill: "tdd", mode: "AFK" },
    ],
  },
  "bad-model": {
    description: "references a missing model",
    stages: [{ skill: "tdd", model: "bad/model", mode: "AFK" }],
  },
};

interface Calls {
  commands: Array<{
    name: string;
    handler: (args: string, ctx: ExtensionContext) => void;
    getArgumentCompletions?: (prefix: string) => Array<{ value: string; label: string; description?: string }> | null;
  }>;
  events: Record<string, (...args: unknown[]) => void>;
  models: Array<{ provider: string; id: string }>;
  messages: string[];
  entries: Array<{ type: string; data: unknown }>;
  widgets: Array<{ id: string; content: unknown }>;
  notifications: Array<{ text: string; type: string }>;
}

function createMockPi(options: { setModelOk?: boolean } = {}) {
  const calls: Calls = {
    commands: [],
    events: {},
    models: [],
    messages: [],
    entries: [],
    widgets: [],
    notifications: [],
  };

  const api = {
    registerCommand: (name: string, options: Calls["commands"][number]) => {
      calls.commands.push({ name, handler: options.handler, getArgumentCompletions: options.getArgumentCompletions });
    },
    on: (event: string, handler: (data: unknown) => void) => {
      calls.events[event] = handler;
    },
    setModel: (model: { provider: string; id: string }) => {
      calls.models.push(model);
      return Promise.resolve(options.setModelOk ?? true);
    },
    sendUserMessage: (content: string) => {
      calls.messages.push(content);
    },
    appendEntry: (type: string, data: unknown) => {
      calls.entries.push({ type, data });
    },
  } as unknown as ExtensionAPI;

  const getCommand = (name: string) => calls.commands.find((c) => c.name === name)?.handler;
  const getCompletions = (name: string) => calls.commands.find((c) => c.name === name)?.getArgumentCompletions;
  const getLastEntry = () => calls.entries[calls.entries.length - 1]?.data as Record<string, unknown>;

  return { api, calls, getCommand, getCompletions, getLastEntry };
}

function createMockCtx(calls: Calls, branch: unknown[] = []): ExtensionContext {
  return {
    ui: {
      notify: (text: string, type: string) => calls.notifications.push({ text, type }),
      setWidget: (id: string, content: unknown) => calls.widgets.push({ id, content }),
    },
    modelRegistry: {
      find: (provider: string, id: string) =>
        provider === "bad" ? undefined : { provider, id, name: `${provider}/${id}` },
    },
    sessionManager: {
      getBranch: () => branch,
    },
  } as unknown as ExtensionContext;
}

function persistedEntry(state: Record<string, unknown>) {
  return { type: "custom", customType: "pi-flow-state", data: state };
}

describe("pi-flow run", () => {
  beforeEach(() => resetState());

  test("running a flow sets state to running at stage 0 with the input", () => {
    const { api, calls, getCommand, getLastEntry } = createMockPi();
    const ctx = createMockCtx(calls);

    piFlowExtension(api, { loadRawFlows: () => TEST_FLOWS });
    const run = getCommand("pi-flow:run");
    expect(run).toBeDefined();
    run!("new-feature build chat feature", ctx);

    const state = getLastEntry();
    expect(state.flowId).toBe("new-feature");
    expect(state.stageIndex).toBe(0);
    expect(state.phase).toBe("running");
    expect(state.input).toBe("build chat feature");
  });

  test("running switches to the first stage's model", () => {
    const { api, calls, getCommand } = createMockPi();
    const ctx = createMockCtx(calls);

    piFlowExtension(api, { loadRawFlows: () => TEST_FLOWS });
    getCommand("pi-flow:run")!("new-feature build chat", ctx);

    expect(calls.models).toHaveLength(1);
    expect(calls.models[0]).toMatchObject({ provider: "opencode-go", id: "qwen3.7-max" });
  });

  test("running does not switch model when the first stage omits one", () => {
    const { api, calls, getCommand } = createMockPi();
    const ctx = createMockCtx(calls);

    piFlowExtension(api, { loadRawFlows: () => TEST_FLOWS });
    getCommand("pi-flow:run")!("all-afk debug it", ctx);

    expect(calls.models).toHaveLength(0);
  });

  test("running sends a kickoff naming the skill and the input", () => {
    const { api, calls, getCommand } = createMockPi();
    const ctx = createMockCtx(calls);

    piFlowExtension(api, { loadRawFlows: () => TEST_FLOWS });
    getCommand("pi-flow:run")!("new-feature build chat feature", ctx);

    expect(calls.messages).toHaveLength(1);
    expect(calls.messages[0]).toContain("grill-with-docs");
    expect(calls.messages[0]).toContain("build chat feature");
  });

  test("run autocompletes flow names with descriptions, filtered by prefix", () => {
    const { api, getCompletions } = createMockPi();

    piFlowExtension(api, { loadRawFlows: () => TEST_FLOWS });
    const complete = getCompletions("pi-flow:run");
    const all = complete!("");
    const filtered = complete!("new");

    const allNames = all?.map((i) => i.value);
    expect(allNames).toEqual(expect.arrayContaining(["all-afk", "bad-model", "new-feature"]));
    expect(filtered).toEqual([
      { value: "new-feature", label: "new-feature", description: "Grill → TDD" },
    ]);
  });

  test("running an unknown flow notifies an error", () => {
    const { api, calls, getCommand } = createMockPi();
    const ctx = createMockCtx(calls);

    piFlowExtension(api, { loadRawFlows: () => TEST_FLOWS });
    getCommand("pi-flow:run")!("nope whatever", ctx);

    expect(calls.notifications[0].type).toBe("error");
    expect(calls.notifications[0].text).toContain("not found");
  });

  test("running while a flow is active refuses with a cancel-first warning", () => {
    const { api, calls, getCommand } = createMockPi();
    const ctx = createMockCtx(calls);

    piFlowExtension(api, { loadRawFlows: () => TEST_FLOWS });
    const run = getCommand("pi-flow:run")!;
    run("new-feature first", ctx);
    run("all-afk second", ctx);

    const warning = calls.notifications.find((n) => n.type === "warning");
    expect(warning?.text).toContain("Cancel it first");
  });

  test("an invalid flow config notifies an error instead of starting", () => {
    const { api, calls, getCommand } = createMockPi();
    const ctx = createMockCtx(calls);

    piFlowExtension(api, { loadRawFlows: () => ({ broken: { stages: [] } }) });
    getCommand("pi-flow:run")!("broken go", ctx);

    expect(calls.notifications[0].type).toBe("error");
    expect(calls.notifications[0].text).toContain("Invalid pi-flow config");
  });
});

describe("pi-flow advancement", () => {
  beforeEach(() => resetState());

  function fireAgentEnd(calls: Calls, ctx: ExtensionContext, finalText: string) {
    calls.events["agent_end"]!({ messages: [{ content: finalText }] }, ctx);
  }

  function start(flowKey: string) {
    const mock = createMockPi();
    const ctx = createMockCtx(mock.calls);
    piFlowExtension(mock.api, { loadRawFlows: () => TEST_FLOWS });
    mock.getCommand("pi-flow:run")!(`${flowKey} go`, ctx);
    return { ...mock, ctx };
  }

  test("the extension subscribes to agent_end", () => {
    const { api, calls } = createMockPi();
    piFlowExtension(api, { loadRawFlows: () => TEST_FLOWS });
    expect(calls.events["agent_end"]).toBeDefined();
  });

  test("an AFK stage advances on agent_end with no anti-signal", () => {
    const { calls, ctx, getLastEntry } = start("all-afk");
    calls.messages.length = 0;

    fireAgentEnd(calls, ctx, "Diagnosis complete.");

    const state = getLastEntry();
    expect(state.stageIndex).toBe(1);
    expect(state.phase).toBe("running");
    expect(calls.messages[0]).toContain("tdd");
  });

  test("an AFK stage halts on agent_end when an anti-signal is present", () => {
    const { calls, ctx, getLastEntry } = start("all-afk");

    fireAgentEnd(calls, ctx, "I am not done — still working on the diagnosis.");

    const state = getLastEntry();
    expect(state.stageIndex).toBe(0);
    expect(state.phase).toBe("gated");
  });

  test("a HITL stage does not auto-advance on agent_end", () => {
    const { calls, ctx, getLastEntry } = start("new-feature");

    fireAgentEnd(calls, ctx, "All questions resolved, shared understanding reached.");

    const state = getLastEntry();
    expect(state.stageIndex).toBe(0);
    expect(state.phase).toBe("running");
  });

  test("/pi-flow:next advances past a HITL stage and switches the next model", () => {
    const { calls, ctx, getCommand, getLastEntry } = start("new-feature");
    calls.models.length = 0;

    getCommand("pi-flow:next")!("", ctx);

    const state = getLastEntry();
    expect(state.stageIndex).toBe(1);
    expect(state.phase).toBe("running");
    expect(calls.models[0]).toMatchObject({ provider: "opencode-go", id: "kimi-k2.6" });
  });

  test("/pi-flow:next during an AFK stage is a no-op with a hint", () => {
    const { calls, ctx, getCommand, getLastEntry } = start("all-afk");

    getCommand("pi-flow:next")!("", ctx);

    const state = getLastEntry();
    expect(state.stageIndex).toBe(0);
    expect(calls.notifications.some((n) => /AFK/.test(n.text))).toBe(true);
  });

  test("an all-AFK flow traverses every stage and completes, clearing the widget", () => {
    const { calls, ctx, getLastEntry } = start("all-afk");

    fireAgentEnd(calls, ctx, "Diagnosis complete.");
    fireAgentEnd(calls, ctx, "All tests passing.");

    const state = getLastEntry();
    expect(state.phase).toBe("complete");
    expect(calls.widgets[calls.widgets.length - 1].content).toBeUndefined();
  });

  test("/pi-flow:next with no active flow errors", () => {
    const { api, calls, getCommand } = createMockPi();
    const ctx = createMockCtx(calls);
    piFlowExtension(api, { loadRawFlows: () => TEST_FLOWS });

    getCommand("pi-flow:next")!("", ctx);

    expect(calls.notifications[0].type).toBe("error");
    expect(calls.notifications[0].text).toContain("No active flow");
  });
});

describe("pi-flow controls", () => {
  beforeEach(() => resetState());

  function start(flowKey: string) {
    const mock = createMockPi();
    const ctx = createMockCtx(mock.calls);
    piFlowExtension(mock.api, { loadRawFlows: () => TEST_FLOWS });
    mock.getCommand("pi-flow:run")!(`${flowKey} go`, ctx);
    return { ...mock, ctx };
  }

  test("/pi-flow:skip force-advances a HITL stage to the next stage", () => {
    const { calls, ctx, getCommand, getLastEntry } = start("new-feature");

    getCommand("pi-flow:skip")!("", ctx);

    const state = getLastEntry();
    expect(state.stageIndex).toBe(1);
    expect(state.phase).toBe("running");
  });

  test("/pi-flow:skip on the last stage completes the flow and clears the widget", () => {
    const { calls, ctx, getCommand, getLastEntry } = start("all-afk");

    getCommand("pi-flow:skip")!("", ctx); // stage 0 -> 1
    getCommand("pi-flow:skip")!("", ctx); // stage 1 -> complete

    expect(getLastEntry().phase).toBe("complete");
    expect(calls.widgets[calls.widgets.length - 1].content).toBeUndefined();
  });

  test("/pi-flow:retry re-sends the current stage kickoff without advancing", () => {
    const { calls, ctx, getCommand, getLastEntry } = start("new-feature");
    calls.messages.length = 0;

    getCommand("pi-flow:retry")!("", ctx);

    expect(getLastEntry().stageIndex).toBe(0);
    expect(calls.messages).toHaveLength(1);
    expect(calls.messages[0]).toContain("grill-with-docs");
  });

  test("/pi-flow:cancel stops the flow and clears the widget", () => {
    const { calls, ctx, getCommand, getLastEntry } = start("new-feature");

    getCommand("pi-flow:cancel")!("", ctx);

    expect(getLastEntry().phase).toBe("idle");
    expect(calls.widgets[calls.widgets.length - 1].content).toBeUndefined();
    expect(calls.notifications.some((n) => /cancel/i.test(n.text))).toBe(true);
  });

  test("/pi-flow:skip with no active flow errors", () => {
    const { api, calls, getCommand } = createMockPi();
    const ctx = createMockCtx(calls);
    piFlowExtension(api, { loadRawFlows: () => TEST_FLOWS });

    getCommand("pi-flow:skip")!("", ctx);

    expect(calls.notifications[0].type).toBe("error");
    expect(calls.notifications[0].text).toContain("No active flow");
  });
});

describe("pi-flow status & widget", () => {
  beforeEach(() => resetState());

  test("running renders a widget showing the flow and current stage", () => {
    const { api, calls, getCommand } = createMockPi();
    const ctx = createMockCtx(calls);
    piFlowExtension(api, { loadRawFlows: () => TEST_FLOWS });

    getCommand("pi-flow:run")!("new-feature go", ctx);

    const content = calls.widgets[calls.widgets.length - 1].content as string[];
    expect(content[0]).toContain("new-feature");
    expect(content[0]).toContain("1/2");
    expect(content[0]).toContain("grill-with-docs");
  });

  test("/pi-flow:status with no active flow lists the catalog", () => {
    const { api, calls, getCommand } = createMockPi();
    const ctx = createMockCtx(calls);
    piFlowExtension(api, { loadRawFlows: () => TEST_FLOWS });

    getCommand("pi-flow:status")!("", ctx);

    expect(calls.notifications[0].text).toContain("new-feature");
    expect(calls.notifications[0].text).toContain("all-afk");
  });

  test("/pi-flow:status with an active flow shows stage, mode, and controls", () => {
    const { api, calls, getCommand } = createMockPi();
    const ctx = createMockCtx(calls);
    piFlowExtension(api, { loadRawFlows: () => TEST_FLOWS });
    getCommand("pi-flow:run")!("new-feature go", ctx);
    calls.notifications.length = 0;

    getCommand("pi-flow:status")!("", ctx);

    const text = calls.notifications[0].text;
    expect(text).toContain("1/2");
    expect(text).toContain("grill-with-docs");
    expect(text).toContain("HITL");
    expect(text).toContain("cancel");
  });

  test("session_start with no active flow renders the idle widget", () => {
    const { api, calls } = createMockPi();
    const ctx = createMockCtx(calls);
    piFlowExtension(api, { loadRawFlows: () => TEST_FLOWS });

    calls.events["session_start"]!({}, ctx);

    const content = calls.widgets[calls.widgets.length - 1].content as string[];
    expect(content[0]).toContain("/pi-flow:run");
  });
});

describe("pi-flow failure handling", () => {
  beforeEach(() => resetState());

  test("running a flow with an unknown model halts before stage 0 with an error", () => {
    const { api, calls, getCommand } = createMockPi();
    const ctx = createMockCtx(calls);
    piFlowExtension(api, { loadRawFlows: () => TEST_FLOWS });

    getCommand("pi-flow:run")!("bad-model go", ctx);

    expect(calls.messages).toHaveLength(0);
    const error = calls.notifications.find((n) => n.type === "error");
    expect(error?.text).toMatch(/bad\/model/);
  });

  test("a stage whose model switch fails mid-flow halts the flow (gated)", async () => {
    const { api, calls, getCommand, getLastEntry } = createMockPi({ setModelOk: false });
    const ctx = createMockCtx(calls);
    piFlowExtension(api, { loadRawFlows: () => TEST_FLOWS });

    getCommand("pi-flow:run")!("new-feature go", ctx);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(getLastEntry().phase).toBe("gated");
    expect(calls.notifications.some((n) => n.type === "error")).toBe(true);
  });

  test("a halted flow can still be steered with /pi-flow:skip", () => {
    const { api, calls, getCommand, getLastEntry } = createMockPi();
    const ctx = createMockCtx(calls);
    piFlowExtension(api, { loadRawFlows: () => TEST_FLOWS });
    getCommand("pi-flow:run")!("all-afk go", ctx);
    calls.events["agent_end"]!({ messages: [{ content: "I am not done yet." }] }, ctx);
    expect(getLastEntry().phase).toBe("gated");

    getCommand("pi-flow:skip")!("", ctx);

    expect(getLastEntry().stageIndex).toBe(1);
    expect(getLastEntry().phase).toBe("running");
  });
});

describe("pi-flow built-ins", () => {
  beforeEach(() => resetState());

  test("a built-in flow runs without any user config", () => {
    const { api, calls, getCommand, getLastEntry } = createMockPi();
    const ctx = createMockCtx(calls);
    piFlowExtension(api, { loadRawFlows: () => undefined });

    getCommand("pi-flow:run")!("debug a crash", ctx);

    const state = getLastEntry();
    expect(state.flowId).toBe("debug");
    expect(state.phase).toBe("running");
  });

  test("/pi-flow:show prints a flow definition as JSON", () => {
    const { api, calls, getCommand } = createMockPi();
    const ctx = createMockCtx(calls);
    piFlowExtension(api, { loadRawFlows: () => undefined });

    getCommand("pi-flow:show")!("debug", ctx);

    const text = calls.notifications[0].text;
    expect(text).toContain("debug");
    expect(text).toContain("diagnose");
    expect(text).toContain("stages");
  });

  test("/pi-flow:show with an unknown name errors", () => {
    const { api, calls, getCommand } = createMockPi();
    const ctx = createMockCtx(calls);
    piFlowExtension(api, { loadRawFlows: () => undefined });

    getCommand("pi-flow:show")!("nope", ctx);

    expect(calls.notifications[0].type).toBe("error");
    expect(calls.notifications[0].text).toContain("not found");
  });
});

describe("pi-flow restore", () => {
  beforeEach(() => resetState());

  test("restores a halted flow on session_start and re-notifies how to continue", () => {
    const { api, calls } = createMockPi();
    const branch = [
      persistedEntry({ flowId: "new-feature", stageIndex: 1, phase: "gated", input: "x", startedAt: 1 }),
    ];
    const ctx = createMockCtx(calls, branch);
    piFlowExtension(api, { loadRawFlows: () => TEST_FLOWS });

    calls.events["session_start"]!({}, ctx);

    expect(getState()).toMatchObject({ flowId: "new-feature", stageIndex: 1, phase: "gated" });
    expect(calls.notifications.some((n) => /restored|continue/i.test(n.text))).toBe(true);
  });

  test("clears a restored state whose flow is no longer defined", () => {
    const { api, calls } = createMockPi();
    const branch = [
      persistedEntry({ flowId: "ghost", stageIndex: 0, phase: "running", input: "x", startedAt: 1 }),
    ];
    const ctx = createMockCtx(calls, branch);
    piFlowExtension(api, { loadRawFlows: () => TEST_FLOWS });

    calls.events["session_start"]!({}, ctx);

    expect(getState()).toBeNull();
    expect(calls.notifications.some((n) => /no longer defined/i.test(n.text))).toBe(true);
  });
});
