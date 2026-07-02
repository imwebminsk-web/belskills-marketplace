"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  setProfileVisibility,
  submitProfileForModeration,
  type OrganizationProfileRow,
  type ProfileModerationState,
} from "@/app/actions/showcase-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  canSubmitProfileForModeration,
  parseShowcaseStatus,
} from "@/lib/organization/profile-status";
import { cn } from "@/lib/utils";

type ProfileStatusBannerProps = {
  profile: OrganizationProfileRow;
  organizationId: string;
};

export function ProfileStatusBanner({
  profile,
  organizationId,
}: ProfileStatusBannerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<ProfileModerationState>({});

  const status = parseShowcaseStatus(profile.status);
  const canSubmit = canSubmitProfileForModeration(profile);
  const isCatalogVisible = status === "published";

  function handleSubmitForModeration() {
    startTransition(async () => {
      const result = await submitProfileForModeration({}, organizationId);
      setFeedback(result);
      if (result.success) {
        router.refresh();
      }
    });
  }

  function handleVisibilityChange(checked: boolean) {
    startTransition(async () => {
      const result = await setProfileVisibility(checked, organizationId);
      setFeedback(result);
      if (result.success) {
        router.refresh();
      }
    });
  }

  if (status === "draft") {
    return (
      <div className="space-y-3">
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            "border-border bg-muted/60 text-muted-foreground",
          )}
          role="status"
        >
          <p className="text-foreground font-medium">Черновик</p>
          <p className="mt-1">
            Профиль не опубликован и не виден в каталоге. Заполните обязательные
            поля и отправьте на проверку.
          </p>
        </div>
        {feedback.error ? (
          <p className="text-destructive text-sm" role="alert">
            {feedback.error}
          </p>
        ) : null}
        {feedback.success ? (
          <p className="text-brand text-sm">Профиль отправлен на проверку.</p>
        ) : null}
        <Button
          type="button"
          onClick={handleSubmitForModeration}
          disabled={!canSubmit || isPending}
        >
          {isPending ? "Отправка…" : "Отправить на проверку"}
        </Button>
      </div>
    );
  }

  if (status === "moderation") {
    return (
      <div
        className={cn(
          "rounded-lg border px-4 py-3 text-sm",
          "border-amber-200 bg-amber-50 text-amber-950",
          "dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100",
        )}
        role="status"
      >
        <p className="font-medium">Профиль на модерации</p>
        <p className="mt-1 opacity-90">Страница скрыта из каталога до одобрения модератором.</p>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="space-y-3">
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            "border-destructive/40 bg-destructive/10 text-destructive",
          )}
          role="alert"
        >
          <p className="font-medium">Профиль отклонён</p>
          <p className="mt-1">
            {profile.rejection_reason?.trim() ||
              "Модератор оставил комментарий без текста. Исправьте данные и отправьте снова."}
          </p>
        </div>
        {feedback.error ? (
          <p className="text-destructive text-sm" role="alert">
            {feedback.error}
          </p>
        ) : null}
        {feedback.success ? (
          <p className="text-brand text-sm">Профиль снова отправлен на проверку.</p>
        ) : null}
        <Button
          type="button"
          onClick={handleSubmitForModeration}
          disabled={!canSubmit || isPending}
        >
          {isPending ? "Отправка…" : "Отправить повторно на проверку"}
        </Button>
      </div>
    );
  }

  if (status === "published" || status === "hidden") {
    return (
      <div className="space-y-3">
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            status === "published"
              ? "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100"
              : "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100",
          )}
          role="status"
        >
          <p className="font-medium">
            {status === "published"
              ? "Профиль опубликован"
              : "Профиль скрыт из каталога"}
          </p>
          {status === "published" ? (
            <p className="mt-1 opacity-90">
              Страница видна посетителям каталога BelSkills.
            </p>
          ) : (
            <p className="mt-1 opacity-90">
              Вы временно отключили показ витрины. Повторная модерация не
              требуется.
            </p>
          )}
        </div>
        {feedback.error ? (
          <p className="text-destructive text-sm" role="alert">
            {feedback.error}
          </p>
        ) : null}
        <div className="flex items-center gap-3">
          <Switch
            id="profile-visibility"
            checked={isCatalogVisible}
            onCheckedChange={handleVisibilityChange}
            disabled={isPending}
          />
          <Label htmlFor="profile-visibility" className="text-sm font-normal">
            Показывать в каталоге
          </Label>
        </div>
      </div>
    );
  }

  if (status === "blocked") {
    return (
      <div
        className={cn(
          "rounded-lg border px-4 py-3 text-sm",
          "border-destructive/40 bg-destructive/10 text-destructive",
        )}
        role="alert"
      >
        <p className="font-medium">Профиль заблокирован</p>
        <p className="mt-1">
          Редактирование недоступно. Обратитесь в поддержку BelSkills для
          разблокировки.
        </p>
      </div>
    );
  }

  return null;
}
