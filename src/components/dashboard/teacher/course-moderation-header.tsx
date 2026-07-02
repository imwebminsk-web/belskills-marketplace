"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  publishCourseForTeacher,
  submitCourseForModeration,
  unpublishCourseForTeacher,
} from "@/app/actions/course-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CourseModerationStatus } from "@/lib/course/course-status";
import type { OrganizationTypeValue } from "@/lib/validations/organization-schema";
import { cn } from "@/lib/utils";

type CourseModerationHeaderProps = {
  courseId: string;
  status: CourseModerationStatus;
  orgType: OrganizationTypeValue;
};

function StatusBadge({
  status,
  orgType,
}: {
  status: CourseModerationStatus;
  orgType: OrganizationTypeValue;
}) {
  switch (status) {
    case "published":
      return (
        <Badge
          variant="outline"
          className="shrink-0 border-brand/40 bg-brand/10 text-brand"
        >
          {orgType === "corporate"
            ? "Опубликован для сотрудников"
            : "Опубликован"}
        </Badge>
      );
    case "moderation":
      return (
        <Badge
          variant="outline"
          className="shrink-0 border-amber-500/35 bg-amber-500/12 text-amber-950 dark:text-amber-100"
        >
          На проверке
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="destructive" className="shrink-0 bg-destructive/10">
          Отклонён
        </Badge>
      );
    case "hidden":
      return (
        <Badge variant="secondary" className="text-muted-foreground shrink-0">
          Снят с публикации
        </Badge>
      );
    case "draft":
    default:
      return (
        <Badge
          variant="secondary"
          className="shrink-0 border-amber-500/35 bg-amber-500/12 text-amber-950 dark:text-amber-100"
        >
          Черновик
        </Badge>
      );
  }
}

export function CourseModerationHeader({
  courseId,
  status,
  orgType,
}: CourseModerationHeaderProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isCorporate = orgType === "corporate";

  const canPublish =
    status === "draft" ||
    status === "hidden" ||
    status === "rejected" ||
    (isCorporate && status === "moderation");

  const canSubmitForModeration =
    !isCorporate &&
    (status === "draft" || status === "hidden" || status === "rejected");

  function handlePublish() {
    setError(null);
    startTransition(async () => {
      const result = await publishCourseForTeacher(courseId);
      if (!result.success) {
        setError(result.error ?? "Не удалось опубликовать курс.");
        toast.error(result.error ?? "Не удалось опубликовать курс.");
        return;
      }
      toast.success("Курс опубликован для сотрудников");
      router.refresh();
    });
  }

  function handleSubmitForModeration() {
    setError(null);
    startTransition(async () => {
      const result = await submitCourseForModeration(courseId);
      if (!result.success) {
        setError(result.error ?? "Не удалось отправить курс на модерацию.");
        toast.error(result.error ?? "Не удалось отправить курс на модерацию.");
        return;
      }
      toast.success("Курс отправлен на проверку");
      router.refresh();
    });
  }

  function handleUnpublish() {
    setError(null);
    startTransition(async () => {
      const result = await unpublishCourseForTeacher(courseId);
      if (!result.success) {
        setError(result.error ?? "Не удалось снять курс с публикации.");
        toast.error(result.error ?? "Не удалось снять курс с публикации.");
        return;
      }
      toast.success(
        isCorporate
          ? "Курс снят с публикации для сотрудников"
          : "Курс снят с публикации",
      );
      router.refresh();
    });
  }

  return (
    <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
      <StatusBadge status={status} orgType={orgType} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {isCorporate && canPublish ? (
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={handlePublish}
          >
            {isPending ? "Публикация…" : "Опубликовать для сотрудников"}
          </Button>
        ) : null}
        {canSubmitForModeration ? (
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={handleSubmitForModeration}
          >
            {isPending ? "Отправка…" : "Отправить на модерацию"}
          </Button>
        ) : null}
        {!isCorporate && status === "moderation" ? (
          <Button type="button" size="sm" disabled>
            На проверке
          </Button>
        ) : null}
        {status === "published" ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={handleUnpublish}
          >
            {isPending ? "Сохранение…" : "Снять с публикации"}
          </Button>
        ) : null}
      </div>
      {error ? (
        <p className={cn("text-destructive max-w-xs text-right text-xs")} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
