import { describe, test, expect } from "vitest";
import { readFileSync } from "fs";
import { parse } from "yaml";

describe("GitHub Actions release workflow", () => {
  test("workflow file exists and triggers on v* tag push", () => {
    const workflowContent = readFileSync(".github/workflows/release.yml", "utf-8");
    const workflow = parse(workflowContent);
    
    expect(workflow.on.push.tags).toContain("v*");
  });

  test("has a test job that runs npm ci and npm test", () => {
    const workflowContent = readFileSync(".github/workflows/release.yml", "utf-8");
    const workflow = parse(workflowContent);

    expect(workflow.jobs.test).toBeDefined();
    const steps = workflow.jobs.test.steps.map((s: any) => s.run ?? s.uses);
    expect(steps.some((s: string) => s && s.includes("npm ci"))).toBe(true);
    expect(steps.some((s: string) => s && s.includes("npm test"))).toBe(true);
  });

  test("extracts version from tag and patches package.json", () => {
    const workflowContent = readFileSync(".github/workflows/release.yml", "utf-8");
    const workflow = parse(workflowContent);

    const testSteps = workflow.jobs.test.steps;
    const versionStep = testSteps.find((s: any) => s.run?.includes("npm version"));
    
    expect(versionStep).toBeDefined();
    expect(versionStep.run).toMatch(/npm version.*--no-git-tag-version/);
  });

  test("publishes to npm with authentication", () => {
    const workflowContent = readFileSync(".github/workflows/release.yml", "utf-8");
    const workflow = parse(workflowContent);

    const testSteps = workflow.jobs.test.steps;
    const publishStep = testSteps.find((s: any) => s.run?.includes("npm publish"));
    
    expect(publishStep).toBeDefined();
    expect(publishStep.run).toMatch(/npm publish.*--access public/);
    expect(publishStep.env?.NODE_AUTH_TOKEN).toMatch(/secrets\.NPM_TOKEN/);
  });

  test("creates a GitHub Release with auto-generated notes", () => {
    const workflowContent = readFileSync(".github/workflows/release.yml", "utf-8");
    const workflow = parse(workflowContent);

    const testSteps = workflow.jobs.test.steps;
    const releaseStep = testSteps.find((s: any) => s.uses?.includes("softprops/action-gh-release"));
    
    expect(releaseStep).toBeDefined();
    expect(releaseStep.with?.generate_release_notes).toBe(true);
  });

  test("tests run before publish (sequential dependency)", () => {
    const workflowContent = readFileSync(".github/workflows/release.yml", "utf-8");
    const workflow = parse(workflowContent);

    const testSteps = workflow.jobs.test.steps;
    const testStepIndex = testSteps.findIndex((s: any) => s.run?.includes("npm test"));
    const publishStepIndex = testSteps.findIndex((s: any) => s.run?.includes("npm publish"));
    
    expect(testStepIndex).toBeGreaterThanOrEqual(0);
    expect(publishStepIndex).toBeGreaterThanOrEqual(0);
    expect(testStepIndex).toBeLessThan(publishStepIndex);
  });

  test("triggers on push to main and pull requests to main", () => {
    const workflowContent = readFileSync(".github/workflows/release.yml", "utf-8");
    const workflow = parse(workflowContent);

    expect(workflow.on.push).toBeDefined();
    expect(workflow.on.push.branches).toContain("main");
    expect(workflow.on.pull_request).toBeDefined();
    expect(workflow.on.pull_request.branches).toContain("main");
  });

  test("publish and release steps only run on tag push", () => {
    const workflowContent = readFileSync(".github/workflows/release.yml", "utf-8");
    const workflow = parse(workflowContent);

    const testSteps = workflow.jobs.test.steps;
    const publishStep = testSteps.find((s: any) => s.run?.includes("npm publish"));
    const releaseStep = testSteps.find((s: any) => s.uses?.includes("softprops/action-gh-release"));
    
    expect(publishStep?.if).toMatch(/startsWith.*github.ref.*refs\/tags/);
    expect(releaseStep?.if).toMatch(/startsWith.*github.ref.*refs\/tags/);
  });

  test("pre-release tags publish under next dist-tag", () => {
    const workflowContent = readFileSync(".github/workflows/release.yml", "utf-8");
    const workflow = parse(workflowContent);

    const testSteps = workflow.jobs.test.steps;
    const publishStep = testSteps.find((s: any) => s.run?.includes("npm publish"));
    
    // Should have conditional logic for pre-release detection
    expect(publishStep?.run).toMatch(/--tag next/);
    // Should check for pre-release identifier (hyphen in version)
    expect(publishStep?.run).toMatch(/GITHUB_REF_NAME.*\*-\*/);
  });
});
