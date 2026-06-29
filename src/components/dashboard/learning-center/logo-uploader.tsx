"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import {
  Building2Icon,
  ImageIcon,
  Loader2Icon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  deleteOrganizationLogo,
  saveOrganizationLogo,
} from "@/app/actions/showcase-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { getCroppedImageBlob } from "@/lib/utils/crop-image";
import { cn } from "@/lib/utils";

const BUCKET = "logos";
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const ACCEPTED_IMAGE_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
} as const;

type LogoUploaderProps = {
  organizationId: string;
  initialLogoUrl: string | null;
  organizationName: string;
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Ш";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function LogoUploader({
  organizationId,
  initialLogoUrl,
  organizationName,
}: LogoUploaderProps) {
  const router = useRouter();
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const busy = uploading || deleting;

  useEffect(() => {
    setLogoUrl(initialLogoUrl);
  }, [initialLogoUrl]);

  const onCropComplete = useCallback(
    (_croppedArea: Area, croppedPixels: Area) => {
      setCroppedAreaPixels(croppedPixels);
    },
    [],
  );

  const resetCropState = useCallback(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }, []);

  const closeCropDialog = useCallback(() => {
    if (uploading) return;
    setCropDialogOpen(false);
    if (imageSrc) {
      URL.revokeObjectURL(imageSrc);
    }
    setImageSrc(null);
    resetCropState();
  }, [imageSrc, resetCropState, uploading]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      if (file.size > MAX_FILE_BYTES) {
        toast.error("Файл слишком большой. Максимум 5 МБ.");
        return;
      }

      const url = URL.createObjectURL(file);
      setImageSrc(url);
      resetCropState();
      setCropDialogOpen(true);
    },
    [resetCropState],
  );

  const onDropRejected = useCallback(() => {
    toast.error("Выберите изображение в формате JPG, PNG или WebP.");
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    onDropRejected,
    accept: ACCEPTED_IMAGE_TYPES,
    maxFiles: 1,
    multiple: false,
    maxSize: MAX_FILE_BYTES,
    noClick: true,
    disabled: busy,
  });

  const handleDeleteLogo = async () => {
    if (!logoUrl) return;

    setDeleting(true);
    try {
      const result = await deleteOrganizationLogo();
      if (!result.success) {
        toast.error(result.error || "Не удалось удалить логотип.");
        return;
      }

      setLogoUrl(null);
      toast.success("Логотип удалён.");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Не удалось удалить логотип.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) {
      toast.error("Сначала выберите область обрезки.");
      return;
    }

    setUploading(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
      const storagePath = `${organizationId}/${Date.now()}.webp`;
      const supabase = createClient();

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, blob, {
          cacheControl: "3600",
          upsert: false,
          contentType: "image/webp",
        });

      if (uploadError) {
        toast.error(uploadError.message || "Не удалось загрузить логотип.");
        return;
      }

      const result = await saveOrganizationLogo(storagePath);
      if (!result.success) {
        toast.error(result.error || "Не удалось сохранить логотип.");
        return;
      }

      setLogoUrl(result.logoUrl);
      toast.success("Логотип обновлён.");
      closeCropDialog();
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Не удалось загрузить логотип.",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Label>Логотип</Label>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex flex-col items-center gap-2">
          <div
            className="bg-muted flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border"
            aria-hidden
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- storage preview URL
              <img
                src={logoUrl}
                alt={`Логотип ${organizationName}`}
                className="size-full object-cover"
              />
            ) : (
              <div className="text-muted-foreground flex flex-col items-center gap-1 p-2 text-center text-xs">
                <Building2Icon className="size-8 opacity-50" />
                <span>{initialsFromName(organizationName)}</span>
              </div>
            )}
          </div>
          {logoUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDeleteLogo}
              disabled={busy}
              className="text-destructive hover:text-destructive h-8 px-2"
            >
              {deleting ? (
                <Loader2Icon className="size-4 animate-spin" aria-hidden />
              ) : (
                <Trash2Icon className="size-4" aria-hidden />
              )}
              <span className="ml-2">Удалить логотип</span>
            </Button>
          ) : null}
        </div>

        <div
          {...getRootProps()}
          className={cn(
            "border-border flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center transition-colors",
            isDragActive && "border-brand bg-brand/5",
            busy && "pointer-events-none opacity-60",
          )}
        >
          <input {...getInputProps()} />
          <ImageIcon className="text-muted-foreground size-8" aria-hidden />
          <p className="text-sm">
            {isDragActive
              ? "Отпустите файл здесь"
              : "Перетащите изображение или выберите файл"}
          </p>
          <p className="text-muted-foreground text-xs">
            JPG, PNG или WebP, до 5 МБ. Квадрат 1:1.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              open();
            }}
            disabled={busy}
          >
            {uploading ? (
              <Loader2Icon className="size-4 animate-spin" aria-hidden />
            ) : (
              <UploadIcon className="size-4" aria-hidden />
            )}
            <span className="ml-2">
              {uploading ? "Загрузка…" : "Загрузить логотип"}
            </span>
          </Button>
        </div>
      </div>

      <Dialog
        open={cropDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeCropDialog();
        }}
      >
        <DialogContent
          className="max-w-lg"
          showCloseButton={!uploading}
          onPointerDownOutside={(event) => {
            if (uploading) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (uploading) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Обрезка логотипа</DialogTitle>
            <DialogDescription>
              Перетащите и масштабируйте изображение. Логотип будет
              квадратным.
            </DialogDescription>
          </DialogHeader>

          <div className="relative h-64 w-full overflow-hidden rounded-md bg-black">
            {imageSrc ? (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo-crop-zoom">Масштаб</Label>
            <input
              id="logo-crop-zoom"
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="w-full accent-brand"
              disabled={uploading}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeCropDialog}
              disabled={uploading}
            >
              Отмена
            </Button>
            <Button
              type="button"
              onClick={handleSaveCrop}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" aria-hidden />
                  <span className="ml-2">Загрузка…</span>
                </>
              ) : (
                "Сохранить"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
