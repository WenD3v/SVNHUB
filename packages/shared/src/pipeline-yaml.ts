import { z } from "zod";
import { parse as parseYaml } from "yaml";

const shellStepSchema = z.object({
  run: z.string().min(1),
});

const jobSchema = z.object({
  name: z.string().min(1),
  image: z.string().min(1),
  steps: z.array(shellStepSchema).min(1),
  env: z.record(z.string(), z.string()).optional(),
  artifacts: z
    .object({
      paths: z.array(z.string().min(1)).min(1),
      retentionDays: z.number().int().positive().optional(),
    })
    .optional(),
  timeout: z.number().int().positive().optional(),
});

const stageSchema = z.object({
  name: z.string().min(1),
  jobs: z.array(jobSchema).min(1),
});

export const pipelineConfigSchema = z.object({
  stages: z.array(stageSchema).min(1),
});

export type PipelineShellStep = z.infer<typeof shellStepSchema>;
export type PipelineJobConfig = z.infer<typeof jobSchema>;
export type PipelineStageConfig = z.infer<typeof stageSchema>;
export type PipelineConfig = z.infer<typeof pipelineConfigSchema>;

export interface PipelineYamlParseResult {
  ok: true;
  config: PipelineConfig;
}

export interface PipelineYamlParseError {
  ok: false;
  error: string;
}

export type PipelineYamlResult = PipelineYamlParseResult | PipelineYamlParseError;

export function parsePipelineYaml(content: string): PipelineYamlResult {
  let parsed: unknown;
  try {
    parsed = parseYaml(content);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid YAML syntax",
    };
  }

  const result = pipelineConfigSchema.safeParse(parsed);
  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
      .join("; ");
    return { ok: false, error: message };
  }

  return { ok: true, config: result.data };
}

export function flattenPipelineJobs(
  config: PipelineConfig,
): Array<PipelineJobConfig & { stageName: string }> {
  return config.stages.flatMap((stage) =>
    stage.jobs.map((job) => ({ ...job, stageName: stage.name })),
  );
}
