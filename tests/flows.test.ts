import { describe, test, expect } from "vitest";
import { resolveFlows } from "../src/flows.js";

describe("resolveFlows", () => {
  test("defaults a stage's missing mode to HITL", () => {
    const flows = resolveFlows({
      demo: { stages: [{ skill: "grill-with-docs" }] },
    });

    expect(flows.demo.stages[0].mode).toBe("HITL");
  });

  test("preserves an explicit AFK mode, model, and description", () => {
    const flows = resolveFlows({
      demo: {
        description: "a demo flow",
        stages: [{ skill: "tdd", model: "opencode-go/kimi-k2.6", mode: "AFK" }],
      },
    });

    expect(flows.demo.description).toBe("a demo flow");
    expect(flows.demo.stages[0]).toEqual({
      skill: "tdd",
      model: "opencode-go/kimi-k2.6",
      mode: "AFK",
    });
  });

  test("leaves model undefined when a stage omits it (no model switch)", () => {
    const flows = resolveFlows({ demo: { stages: [{ skill: "tdd" }] } });

    expect(flows.demo.stages[0].model).toBeUndefined();
  });

  test("rejects a flow with no stages", () => {
    expect(() => resolveFlows({ demo: { stages: [] } })).toThrow(/demo/);
  });

  test("rejects a stage missing a skill", () => {
    expect(() => resolveFlows({ demo: { stages: [{ model: "x/y" }] } })).toThrow(
      /skill/,
    );
  });

  test("rejects a stage whose mode is neither HITL nor AFK", () => {
    expect(() =>
      resolveFlows({ demo: { stages: [{ skill: "tdd", mode: "AKF" }] } }),
    ).toThrow(/mode/);
  });

  test("ships the three built-in flows with no user config", () => {
    const flows = resolveFlows(undefined);

    expect(Object.keys(flows).sort()).toEqual(["debug", "improve-arch", "new-feature"]);
  });

  test("a user flow overrides a built-in of the same name", () => {
    const flows = resolveFlows({
      "new-feature": { stages: [{ skill: "custom", mode: "AFK" }] },
    });

    expect(flows["new-feature"].stages).toHaveLength(1);
    expect(flows["new-feature"].stages[0].skill).toBe("custom");
  });

  test("a user flow with a new name is added alongside the built-ins", () => {
    const flows = resolveFlows({ mine: { stages: [{ skill: "tdd" }] } });

    expect(flows.mine).toBeDefined();
    expect(flows["new-feature"]).toBeDefined();
    expect(flows.debug).toBeDefined();
  });
});
