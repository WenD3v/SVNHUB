"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AtSign, KeyRound, UserRound } from "lucide-react";

import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { apiFetch, apiUploadForm } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type { UserProfile } from "@svnhub/shared";

interface ProfileSettingsFormProps {
  initialProfile: UserProfile;
}

function SectionIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
      {children}
    </span>
  );
}

export function ProfileSettingsForm({ initialProfile }: ProfileSettingsFormProps) {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(initialProfile.displayName ?? "");
  const [bio, setBio] = useState(initialProfile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatarUrl);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const profile = await apiFetch<UserProfile>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: displayName.trim() || null,
          bio: bio.trim() || null,
        }),
      });
      setAvatarUrl(profile.avatarUrl);
      await refreshUser();
      setMessage("Perfil atualizado.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar perfil");
    } finally {
      setLoading(false);
    }
  }

  async function uploadAvatar(file: File) {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const profile = await apiUploadForm<UserProfile>("/users/me/avatar", formData);
      setAvatarUrl(profile.avatarUrl);
      await refreshUser();
      setMessage("Avatar atualizado.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar avatar");
    } finally {
      setLoading(false);
    }
  }

  async function removeAvatar() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const profile = await apiFetch<UserProfile>("/users/me/avatar", { method: "DELETE" });
      setAvatarUrl(profile.avatarUrl);
      await refreshUser();
      setMessage("Avatar removido.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover avatar");
    } finally {
      setLoading(false);
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await apiFetch("/users/me/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setMessage("Senha alterada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao alterar senha");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-success">{message}</p> : null}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <SectionIcon>
              <UserRound className="size-4" aria-hidden />
            </SectionIcon>
            <CardTitle>Informações públicas</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <UserAvatar
              username={initialProfile.username}
              avatarUrl={avatarUrl}
              className="size-20 text-lg"
            />
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void uploadAvatar(file);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => fileInputRef.current?.click()}
              >
                Enviar imagem
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading || !avatarUrl}
                onClick={() => void removeAvatar()}
              >
                Remover
              </Button>
            </div>
          </div>

          <form className="space-y-4" onSubmit={saveProfile}>
            <div className="space-y-2">
              <Label htmlFor="displayName">Nome de exibição</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="handle" className="flex items-center gap-1.5">
                <AtSign className="size-3.5 text-muted-foreground" aria-hidden />
                Handle
              </Label>
              <Input
                id="handle"
                value={`@${initialProfile.username}`}
                readOnly
                className="font-mono text-muted-foreground"
                aria-readonly
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <textarea
                id="bio"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                rows={4}
                className={cn(
                  "flex min-h-[80px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm",
                  "ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              />
            </div>
            <Button type="submit" disabled={loading}>
              Salvar perfil
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <SectionIcon>
              <KeyRound className="size-4" aria-hidden />
            </SectionIcon>
            <CardTitle>Senha</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <form className="space-y-4" onSubmit={changePassword}>
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Senha atual</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading}>
              Alterar senha
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
