import { describe, test, expect } from "vitest";
import { resolveFlows, BUILTIN_FLOWS } from "../src/flows.js";

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

  test("returns an empty catalog when there is no config", () => {
    expect(resolveFlows(undefined)).toEqual({});
  });

  test("returns only the flows in the config (built-ins are not merged in)", () => {
    const flows = resolveFlows({ mine: { stages: [{ skill: "tdd" }] } });

    expect(Object.keys(flows)).toEqual(["mine"]);
  });

  test("BUILTIN_FLOWS holds the three classics as seed content", () => {
    expect(Object.keys(BUILTIN_FLOWS).sort()).toEqual(["debug", "improve-arch", "new-feature"]);
  });
});
