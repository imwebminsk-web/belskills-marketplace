import type { Area } from "react-easy-crop";

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Не удалось загрузить изображение")));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
}

export async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: Area,
  mimeType: string = "image/webp",
  quality: number = 0.92,
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas не поддерживается в этом браузере");
  }

  canvas.width = Math.round(pixelCrop.width);
  canvas.height = Math.round(pixelCrop.height);

  context.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Не удалось обрезать изображение"));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}
