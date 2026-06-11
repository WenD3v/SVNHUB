export interface AdminUserEntry {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isLocal: boolean;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminUsersListResponse {
  users: AdminUserEntry[];
  total: number;
}

export interface CreateAdminUserRequest {
  email: string;
  username: string;
  displayName?: string;
  password: string;
  isAdmin?: boolean;
}

export interface UpdateAdminUserRequest {
  email?: string;
  displayName?: string | null;
  isAdmin?: boolean;
  isActive?: boolean;
}

export interface ResetAdminUserPasswordRequest {
  password: string;
}

export interface UpdateProfileRequest {
  displayName?: string | null;
  bio?: string | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
}
