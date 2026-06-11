import { describe, expect, it } from "vitest";

import {
  aggregatePipelineStatus,
  canTransitionJob,
  canTransitionPipeline,
  isTerminalPipelineStatus,
} from "./pipeline-state.js";

describe("canTransitionPipeline", () => {
  it("allows PENDING to QUEUED", () => {
    expect(canTransitionPipeline("PENDING", "QUEUED")).toBe(true);
  });

  it("allows RUNNING to SUCCESS", () => {
    expect(canTransitionPipeline("RUNNING", "SUCCESS")).toBe(true);
  });

  it("blocks transitions from terminal states", () => {
    expect(canTransitionPipeline("SUCCESS", "RUNNING")).toBe(false);
    expect(canTransitionPipeline("FAILURE", "QUEUED")).toBe(false);
    expect(canTransitionPipeline("CANCELED", "RUNNING")).toBe(false);
  });
});

describe("canTransitionJob", () => {
  it("allows QUEUED to RUNNING", () => {
    expect(canTransitionJob("QUEUED", "RUNNING")).toBe(true);
  });

  it("blocks SUCCESS to RUNNING", () => {
    expect(canTransitionJob("SUCCESS", "RUNNING")).toBe(false);
  });
});

describe("aggregatePipelineStatus", () => {
  it("returns FAILURE when any job failed", () => {
    expect(
      aggregatePipelineStatus(["SUCCESS", "FAILURE"], "RUNNING"),
    ).toBe("FAILURE");
  });

  it("returns SUCCESS when all jobs succeeded", () => {
    expect(
      aggregatePipelineStatus(["SUCCESS", "SUCCESS"], "RUNNING"),
    ).toBe("SUCCESS");
  });

  it("returns RUNNING when a job is running", () => {
    expect(
      aggregatePipelineStatus(["SUCCESS", "RUNNING"], "RUNNING"),
    ).toBe("RUNNING");
  });

  it("returns CANCELED when pipeline was canceled", () => {
    expect(
      aggregatePipelineStatus(["CANCELED", "QUEUED"], "CANCELED"),
    ).toBe("CANCELED");
  });
});

describe("isTerminalPipelineStatus", () => {
  it("identifies terminal states", () => {
    expect(isTerminalPipelineStatus("SUCCESS")).toBe(true);
    expect(isTerminalPipelineStatus("RUNNING")).toBe(false);
  });
});
