"use client";

import { compressImage } from "@/lib/utils/image-compression";

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
 * Сжимает изображение через `compressImage` (~100 КБ цель) и загружает на `/api/upload`.
 * Пост-сжатие не отклоняется по размеру: финальный потолок задаёт API (2 МБ), как у галереи курсов.
 */
export async function uploadCompressedImageViaApi(
  file: File,
): Promise<{ url: string } | { error: string }> {
  const compressed = await compressImage(file);
  return postImageToUploadApi(compressed);
}
