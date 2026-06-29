"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon, Loader2Icon, UploadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { uploadCompressedImageViaApi } from "@/lib/utils/upload-via-api";
import { cn } from "@/lib/utils";

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

type CoverUploaderProps = {
  initialCoverUrl: string | null;
  disabled?: boolean;
  onChange?: (url: string | null) => void;
};

export function CoverUploader({
  initialCoverUrl,
  disabled = false,
  onChange,
}: CoverUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [coverUrl, setCoverUrl] = useState(initialCoverUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCoverUrl(initialCoverUrl ?? "");
  }, [initialCoverUrl]);

  function updateCoverUrl(next: string | null) {
    const value = next ?? "";
    setCoverUrl(value);
    onChange?.(next);
  }

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);

    if (!ALLOWED.has(file.type)) {
      setError("Допустимы только JPEG, PNG, WebP или GIF.");
      return;
    }

    setBusy(true);
    try {
      const result = await uploadCompressedImageViaApi(file, {
        fileLabel: file.name,
      });

      if ("error" in result) {
        setError(result.error);
        return;
      }

      updateCoverUrl(result.url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось загрузить обложку.",
      );
    } finally {
      setBusy(false);
    }
  }

  function clearCover() {
    if (!window.confirm("Убрать обложку витрины?")) {
      return;
    }
    setError(null);
    updateCoverUrl(null);
  }

  const isDisabled = disabled || busy;

  return (
    <div className="space-y-3">
      <input type="hidden" name="cover_url" value={coverUrl} />
      <Label>Обложка витрины</Label>
      <div
        className={cn(
          "border-border bg-muted/20 space-y-3 rounded-lg border p-4",
          isDisabled && "opacity-60",
        )}
      >
        <p className="text-muted-foreground text-xs">
          Соотношение сторон 3:2 — как на публичной странице школы. Файл
          загружается через Storage и сохраняется при отправке формы.
        </p>

        <div className="border-border bg-card relative flex aspect-[3/2] w-full max-w-md items-center justify-center overflow-hidden rounded-lg border">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt="Обложка учебного центра"
              className="size-full object-cover"
            />
          ) : (
            <div className="text-muted-foreground flex flex-col items-center gap-2 p-6 text-center text-sm">
              <ImageIcon className="size-10 opacity-50" aria-hidden />
              <span>Обложка не задана</span>
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={(event) => void onFileChange(event)}
          disabled={isDisabled}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={isDisabled}
          >
            {busy ? (
              <Loader2Icon className="size-4 animate-spin" aria-hidden />
            ) : (
              <UploadIcon className="size-4" aria-hidden />
            )}
            <span className="ml-2">Выбрать файл</span>
          </Button>
          {coverUrl ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearCover}
              disabled={isDisabled}
            >
              Убрать обложку
            </Button>
          ) : null}
        </div>

        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
