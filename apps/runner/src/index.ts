import { createRunner } from "./runner.js";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const apiBaseUrl = process.env.API_INTERNAL_URL ?? "http://localhost:4000";
const runnerSecret = process.env.RUNNER_SECRET;
const artifactsStoragePath = process.env.ARTIFACTS_STORAGE_PATH ?? "./data/artifacts";
const svnBin = process.env.SVN_BIN ?? "svn";
const useDocker = process.env.RUNNER_USE_DOCKER === "true";

const runner = createRunner({
  redisUrl,
  apiBaseUrl,
  runnerSecret,
  artifactsStoragePath,
  svnBin,
  useDocker,
});

void runner.start();

async function shutdown() {
  await runner.stop();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});
