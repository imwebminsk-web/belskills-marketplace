"use client";

import { useState } from "react";
import Image from "next/image";

import { GalleryLightbox } from "@/components/showcase/gallery-lightbox";
import { cn } from "@/lib/utils";

type ShowcaseGalleryProps = {
  urls: string[];
  className?: string;
};

export function ShowcaseGallery({ urls, className }: ShowcaseGalleryProps) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  if (urls.length === 0) {
    return null;
  }

  function openAtImage(imageIndex: number) {
    setIndex(imageIndex);
    setOpen(true);
  }

  return (
    <>
      <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3", className)}>
        {urls.map((url, imageIndex) => (
          <button
            key={`${url}-${imageIndex}`}
            type="button"
            className="bg-muted focus-visible:ring-ring relative aspect-[4/3] overflow-hidden rounded-lg border transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none"
            onClick={() => openAtImage(imageIndex)}
            aria-label={`Открыть фото ${imageIndex + 1} в галерее`}
          >
            <Image
              src={url}
              alt={`Фото учебного центра ${imageIndex + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, 240px"
              unoptimized
            />
          </button>
        ))}
      </div>

      <GalleryLightbox
        images={urls}
        open={open}
        index={index}
        setOpen={setOpen}
        setIndex={setIndex}
      />
    </>
  );
}
