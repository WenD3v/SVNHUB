export interface RepositorySummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  defaultBranch: string;
  isArchived: boolean;
}
