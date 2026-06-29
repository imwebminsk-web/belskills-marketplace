"use client";

import { compressImage } from "@/lib/utils/image-compression";

/** Целевой потолок после клиентского сжатия (как в галерее курсов). */
export const UPLOAD_COMPRESSED_MAX_BYTES = 100 * 1024;

async function postImageToUploadApi(
  file: File,
): Promise<{ url: string } | { error: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json()) as { url?: string; error?: string };

  if (!response.ok) {
    return { error: payload.error ?? "Не удалось загрузить изображение." };
  }

  if (!payload.url) {
    return { error: "Сервер не вернул URL изображения." };
  }

  return { url: payload.url };
}

/**
 * Сжимает изображение через `compressImage` (~100 КБ) и загружает на `/api/upload`.
 * Использует ту же утилиту, что галерея курсов и редактор TipTap.
 */
export async function uploadCompressedImageViaApi(
  file: File,
  options?: { fileLabel?: string },
): Promise<{ url: string } | { error: string }> {
  const compressed = await compressImage(file);

  if (compressed.size > UPLOAD_COMPRESSED_MAX_BYTES) {
    const label = options?.fileLabel ?? file.name;
    return {
      error: `${label}: после сжатия файл всё ещё больше 100 КБ.`,
    };
  }

  return postImageToUploadApi(compressed);
}
