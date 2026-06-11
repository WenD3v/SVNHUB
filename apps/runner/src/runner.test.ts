import { describe, expect, it } from "vitest";

import { LocalProcessExecutor } from "./local-process-executor.js";
import { createRunner } from "./runner.js";

describe("createRunner", () => {
  it("creates a runner with lifecycle methods", () => {
    const runner = createRunner({
      redisUrl: "redis://localhost:6379",
      apiBaseUrl: "http://localhost:4000",
      artifactsStoragePath: "./data/artifacts",
      svnBin: "svn",
      executor: new LocalProcessExecutor(),
      useDocker: false,
    });

    expect(typeof runner.start).toBe("function");
    expect(typeof runner.stop).toBe("function");
  });
});
