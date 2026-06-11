import { describe, expect, it } from "vitest";

import { flattenPipelineJobs, parsePipelineYaml } from "./pipeline-yaml.js";

const VALID_YAML = `
stages:
  - name: build
    jobs:
      - name: test
        image: node:22
        steps:
          - run: npm test
        env:
          NODE_ENV: test
        artifacts:
          paths:
            - dist/**
          retentionDays: 7
        timeout: 300
`;

describe("parsePipelineYaml", () => {
  it("parses valid pipeline config", () => {
    const result = parsePipelineYaml(VALID_YAML);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.config.stages).toHaveLength(1);
    expect(result.config.stages[0]?.jobs[0]?.name).toBe("test");
    expect(result.config.stages[0]?.jobs[0]?.image).toBe("node:22");
  });

  it("rejects empty stages", () => {
    const result = parsePipelineYaml("stages: []");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("stages");
  });

  it("rejects job without steps", () => {
    const result = parsePipelineYaml(`
stages:
  - name: build
    jobs:
      - name: empty
        image: alpine
        steps: []
`);
    expect(result.ok).toBe(false);
  });

  it("rejects invalid YAML syntax", () => {
    const result = parsePipelineYaml("stages: [invalid");
    expect(result.ok).toBe(false);
  });

  it("rejects job without image", () => {
    const result = parsePipelineYaml(`
stages:
  - name: build
    jobs:
      - name: no-image
        steps:
          - run: echo hi
`);
    expect(result.ok).toBe(false);
  });
});

describe("flattenPipelineJobs", () => {
  it("flattens stages into jobs with stageName", () => {
    const result = parsePipelineYaml(`
stages:
  - name: build
    jobs:
      - name: a
        image: alpine
        steps:
          - run: echo a
  - name: deploy
    jobs:
      - name: b
        image: alpine
        steps:
          - run: echo b
`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const jobs = flattenPipelineJobs(result.config);
    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toMatchObject({ stageName: "build", name: "a" });
    expect(jobs[1]).toMatchObject({ stageName: "deploy", name: "b" });
  });
});
