export interface JobExecutionInput {
  image: string;
  workdir: string;
  steps: Array<{ run: string }>;
  env: Record<string, string>;
  timeoutSeconds: number;
  onOutput: (chunk: string) => void;
}

export interface JobExecutionResult {
  exitCode: number;
}

export interface JobExecutor {
  execute(input: JobExecutionInput): Promise<JobExecutionResult>;
}
