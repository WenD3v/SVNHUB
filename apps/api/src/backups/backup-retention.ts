export interface BackupRetentionItem {
  id: string;
  path?: string;
  createdAt: Date;
}

export function selectBackupsForRetention<T extends BackupRetentionItem>(
  backups: T[],
  retentionCount: number,
): T[] {
  if (retentionCount < 1) {
    return backups;
  }

  const sorted = [...backups].sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
  );

  return sorted.slice(retentionCount).reverse();
}
