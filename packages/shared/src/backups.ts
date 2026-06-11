export interface BackupEntry {
  id: string;
  path: string;
  sizeBytes: string | null;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface BackupListResponse {
  backups: BackupEntry[];
  total: number;
}

export type HealthStatus = "UNKNOWN" | "HEALTHY" | "UNHEALTHY" | "VERIFYING";

export interface RepositoryHealthSummary {
  status: HealthStatus;
  lastVerifiedAt: string | null;
  lastError: string | null;
}

export interface InstanceSettingsSummary {
  backupCron: string;
  backupRetentionCount: number;
  verifyCron: string;
}

export interface UpdateInstanceSettingsRequest {
  backupCron?: string;
  backupRetentionCount?: number;
  verifyCron?: string;
}
