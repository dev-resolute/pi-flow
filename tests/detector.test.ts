import { describe, test, expect } from "vitest";
import { hasAntiSignal } from "../src/detector.js";

describe("hasAntiSignal", () => {
  test("true when the message says it is not done", () => {
    expect(hasAntiSignal("I am not done with the review yet.")).toBe(true);
  });

  test("false when the message reads as complete", () => {
    expect(hasAntiSignal("The PRD has been created and published.")).toBe(false);
  });

  test("matches case-insensitively", () => {
    expect(hasAntiSignal("STILL WORKING ON the implementation.")).toBe(true);
  });

  test("detects a request to wait as an anti-signal", () => {
    expect(hasAntiSignal("Waiting for your confirmation before I continue.")).toBe(true);
  });
});
