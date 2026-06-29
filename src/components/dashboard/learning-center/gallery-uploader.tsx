"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlusIcon, Loader2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { uploadCompressedImageViaApi } from "@/lib/utils/upload-via-api";

export const SHOWCASE_GALLERY_MAX = 8;

type GalleryUploaderProps = {
  initialUrls: string[];
  disabled?: boolean;
  onChange?: (urls: string[]) => void;
};

export function GalleryUploader({
  initialUrls,
  disabled = false,
  onChange,
}: GalleryUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>(() =>
    initialUrls.filter((url) => url.trim().length > 0),
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setImages(initialUrls.filter((url) => url.trim().length > 0));
  }, [initialUrls]);

  function updateImages(next: string[]) {
    setImages(next);
    onChange?.(next);
  }

  async function onFilesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setBusy(true);
    try {
      let count = images.length;

      for (const raw of files) {
        if (count >= SHOWCASE_GALLERY_MAX) {
          toast.error(`В галерее не более ${SHOWCASE_GALLERY_MAX} изображений.`);
          break;
        }

        try {
          const result = await uploadCompressedImageViaApi(raw, {
            fileLabel: raw.name,
          });
          if ("error" in result) {
            toast.error(result.error);
            continue;
          }

          setImages((previous) => {
            const next = [...previous, result.url];
            onChange?.(next);
            return next;
          });
          count += 1;
          toast.success("Изображение добавлено в галерею");
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : "Не удалось обработать файл.",
          );
        }
      }
    } finally {
      setBusy(false);
    }
  }

  function removeImage(index: number) {
    updateImages(images.filter((_, imageIndex) => imageIndex !== index));
  }

  const isDisabled = disabled || busy;

  return (
    <div className="space-y-3">
      <input type="hidden" name="gallery" value={images.join("\n")} />
      <Label>Галерея</Label>
      <div className="border-border bg-muted/20 space-y-4 rounded-lg border p-4">
        <p className="text-muted-foreground text-xs">
          До {SHOWCASE_GALLERY_MAX} изображений. Файлы сжимаются в браузере,
          загружаются через Storage. Нажмите «Сохранить», чтобы записать список
          URL в профиль.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="sr-only"
            tabIndex={-1}
            disabled={isDisabled}
            onChange={(event) => void onFilesChange(event)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isDisabled || images.length >= SHOWCASE_GALLERY_MAX}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? (
              <Loader2Icon className="mr-2 size-4 animate-spin" aria-hidden />
            ) : (
              <ImagePlusIcon className="mr-2 size-4" aria-hidden />
            )}
            Добавить изображения
          </Button>
          <span className="text-muted-foreground text-xs">
            {images.length} / {SHOWCASE_GALLERY_MAX}
          </span>
        </div>

        {images.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((url, index) => (
              <div
                key={`${url}-${index}`}
                className="border-border group relative aspect-square overflow-hidden rounded-lg border bg-muted/30"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Галерея ${index + 1}`}
                  className="size-full object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-xs"
                  className="absolute top-1.5 right-1.5 opacity-90"
                  disabled={isDisabled}
                  aria-label={`Удалить изображение ${index + 1}`}
                  onClick={() => removeImage(index)}
                >
                  <XIcon className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Изображения галереи пока не добавлены.
          </p>
        )}
      </div>
    </div>
  );
}
