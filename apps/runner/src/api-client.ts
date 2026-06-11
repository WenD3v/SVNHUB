import type {
  AppendJobLogRequest,
  RegisterArtifactRequest,
  UpdateJobStatusRequest,
} from "@svnhub/shared";

export interface RunnerApiClientOptions {
  baseUrl: string;
  secret?: string;
}

export class RunnerApiClient {
  constructor(private readonly options: RunnerApiClientOptions) {}

  async isPipelineCanceled(pipelineId: string): Promise<boolean> {
    const response = await this.request<{ canceled?: boolean } | boolean>(
      `/internal/pipelines/${pipelineId}/canceled`,
      { method: "GET" },
    );
    if (typeof response === "boolean") {
      return response;
    }
    return Boolean(response.canceled);
  }

  async updateJobStatus(jobId: string, body: UpdateJobStatusRequest): Promise<void> {
    await this.request(`/internal/pipelines/jobs/${jobId}/status`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  async appendJobLog(jobId: string, body: AppendJobLogRequest): Promise<void> {
    await this.request(`/internal/pipelines/jobs/${jobId}/logs`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async registerArtifact(jobId: string, body: RegisterArtifactRequest): Promise<void> {
    await this.request(`/internal/pipelines/jobs/${jobId}/artifacts`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetch(`${this.options.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(this.options.secret ? { "X-Runner-Secret": this.options.secret } : {}),
        ...init.headers,
      },
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `API error ${response.status}`);
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return response.json() as Promise<T>;
  }
}
