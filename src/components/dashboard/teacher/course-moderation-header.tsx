"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  submitCourseForModeration,
  unpublishCourseForTeacher,
} from "@/app/actions/course-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CourseModerationStatus } from "@/lib/course/course-status";
import { cn } from "@/lib/utils";

type CourseModerationHeaderProps = {
  courseId: string;
  status: CourseModerationStatus;
};

function StatusBadge({ status }: { status: CourseModerationStatus }) {
  switch (status) {
    case "published":
      return (
        <Badge
          variant="outline"
          className="shrink-0 border-brand/40 bg-brand/10 text-brand"
        >
          Опубликован
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
}: CourseModerationHeaderProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSubmit =
    status === "draft" || status === "hidden" || status === "rejected";

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
      toast.success("Курс снят с публикации");
      router.refresh();
    });
  }

  return (
    <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
      <StatusBadge status={status} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {canSubmit ? (
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={handleSubmitForModeration}
          >
            {isPending ? "Отправка…" : "Отправить на модерацию"}
          </Button>
        ) : null}
        {status === "moderation" ? (
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
