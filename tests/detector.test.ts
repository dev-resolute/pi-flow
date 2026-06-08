import { describe, test, expect } from "vitest";
import { detectCompletion } from "../src/detector.js";

describe("completion detector", () => {
  test("detects completion when message contains a signal phrase", () => {
    const result = detectCompletion(
      "All questions have been resolved and we have a shared understanding.",
      "grill",
      "new-feature"
    );

    expect(result.complete).toBe(true);
    expect(result.matchedSignal).toBe("all questions resolved");
  });

  test("returns no completion when message has no signal", () => {
    const result = detectCompletion(
      "Let me think about this some more...",
      "grill",
      "new-feature"
    );

    expect(result.complete).toBe(false);
    expect(result.matchedSignal).toBeUndefined();
  });

  test("anti-signal overrides completion match", () => {
    const result = detectCompletion(
      "All questions resolved but I am not yet complete with the review.",
      "grill",
      "new-feature"
    );

    expect(result.complete).toBe(false);
    expect(result.matchedSignal).toBeUndefined();
  });

  test("matches signals case-insensitively", () => {
    const result = detectCompletion(
      "PRD CREATED and published to the tracker.",
      "prd",
      "new-feature"
    );

    expect(result.complete).toBe(true);
    expect(result.matchedSignal).toBe("PRD created");
  });

  test("each stage has its own completion signals", () => {
    const grillResult = detectCompletion(
      "The PRD has been created.",
      "grill",
      "new-feature"
    );
    expect(grillResult.complete).toBe(false);

    const prdResult = detectCompletion(
      "The PRD has been created.",
      "prd",
      "new-feature"
    );
    expect(prdResult.complete).toBe(true);
  });
});
