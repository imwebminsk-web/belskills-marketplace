"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { updateOrganizationSlug } from "@/app/actions/showcase-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  sanitizeOrganizationSlug,
  validateOrganizationSlug,
} from "@/lib/organization/showcase-profile";
import { cn } from "@/lib/utils";

type SlugFieldProps = {
  initialSlug: string;
  organizationId: string;
};

export function SlugField({ initialSlug, organizationId }: SlugFieldProps) {
  const router = useRouter();
  const [slug, setSlug] = useState(initialSlug || "");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const normalizedSlug = sanitizeOrganizationSlug(slug);
  const isDirty = normalizedSlug !== (initialSlug || "");

  useEffect(() => {
    setSlug(initialSlug || "");
    setFieldError(null);
  }, [initialSlug]);

  const handleSlugChange = (nextValue: string) => {
    setSlug(nextValue);
    if (fieldError) {
      setFieldError(null);
    }
  };

  const handleSave = () => {
    if (!isDirty || saving) {
      return;
    }

    if (!normalizedSlug) {
      setFieldError("Укажите адрес витрины");
      return;
    }

    const formatError = validateOrganizationSlug(normalizedSlug);
    if (formatError) {
      setFieldError(formatError);
      return;
    }

    startSaving(async () => {
      setFieldError(null);

      const result = await updateOrganizationSlug(normalizedSlug, organizationId);

      if (!result.success) {
        setFieldError(result.error);
        return;
      }

      toast.success("Адрес страницы сохранён.");
      router.refresh();
    });
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="organization_slug">
        URL учебного центра (slug)
        <span className="text-destructive" aria-hidden>
          {" "}
          *
        </span>
      </Label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div
          className={cn(
            "flex min-w-0 flex-1 overflow-hidden rounded-lg border border-input bg-transparent transition-colors",
            "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
            fieldError && "border-destructive focus-within:ring-destructive/20",
          )}
        >
          <span
            className="bg-muted text-muted-foreground flex shrink-0 items-center border-r border-input px-3 text-sm select-none"
            aria-hidden
          >
            /school/
          </span>
          <Input
            id="organization_slug"
            value={slug || ""}
            onChange={(event) => handleSlugChange(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder="my-school"
            required
            disabled={saving}
            aria-invalid={fieldError ? true : undefined}
            className="rounded-none border-0 bg-transparent shadow-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="shrink-0"
        >
          {saving ? (
            <Loader2Icon className="size-4 animate-spin" aria-hidden />
          ) : (
            "Сохранить адрес"
          )}
        </Button>
      </div>

      <div className="flex items-center gap-2 text-sm">
        {saving ? (
          <Loader2Icon className="text-muted-foreground size-4 animate-spin" />
        ) : null}
        {fieldError ? (
          <XIcon className="text-destructive size-4 shrink-0" aria-hidden />
        ) : null}
        <span
          className={cn(
            fieldError && "text-destructive",
            !fieldError && "text-muted-foreground",
          )}
          role={fieldError ? "alert" : undefined}
        >
          {saving
            ? "Сохранение…"
            : fieldError
              ? fieldError
              : `Текущий адрес: /school/${initialSlug || ""}`}
        </span>
      </div>
    </div>
  );
}
