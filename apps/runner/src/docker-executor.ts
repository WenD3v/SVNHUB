import type { JobExecutionInput, JobExecutionResult, JobExecutor } from "./executor.js";

export class DockerExecutor implements JobExecutor {
  async execute(input: JobExecutionInput): Promise<JobExecutionResult> {
    const dockerode = await import("dockerode");
    const Docker = dockerode.default;
    const docker = new Docker();

    const script = input.steps.map((step) => step.run).join("\n");
    const container = await docker.createContainer({
      Image: input.image,
      WorkingDir: "/workspace",
      Env: Object.entries(input.env).map(([key, value]) => `${key}=${value}`),
      HostConfig: {
        Binds: [`${input.workdir}:/workspace:rw`],
        NetworkMode: "none",
        Memory: 512 * 1024 * 1024,
        NanoCpus: 1_000_000_000,
        AutoRemove: true,
      },
      User: "nobody",
      Cmd: ["/bin/sh", "-c", script],
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await container.attach({
      stream: true,
      stdout: true,
      stderr: true,
    });

    stream.on("data", (chunk: Buffer) => {
      input.onOutput(chunk.toString("utf8"));
    });

    await container.start();

    const result = await new Promise<{ StatusCode: number }>((resolve, reject) => {
      const timeout = setTimeout(async () => {
        try {
          await container.kill();
        } catch {
          // container may already be stopped
        }
        input.onOutput(`\n[runner] container timed out after ${input.timeoutSeconds}s\n`);
        resolve({ StatusCode: 124 });
      }, input.timeoutSeconds * 1000);

      container.wait((error, data) => {
        clearTimeout(timeout);
        if (error) {
          reject(error);
          return;
        }
        resolve(data ?? { StatusCode: 1 });
      });
    });

    return { exitCode: result.StatusCode };
  }
}
