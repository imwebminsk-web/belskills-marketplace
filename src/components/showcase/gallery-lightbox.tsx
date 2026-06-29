"use client";

import Lightbox from "yet-another-react-lightbox";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";

import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";

type GalleryLightboxProps = {
  images: string[];
  open: boolean;
  index: number;
  setOpen: (open: boolean) => void;
  setIndex: (index: number) => void;
};

export function GalleryLightbox({
  images,
  open,
  index,
  setOpen,
  setIndex,
}: GalleryLightboxProps) {
  if (images.length === 0) {
    return null;
  }

  return (
    <Lightbox
      open={open}
      close={() => setOpen(false)}
      index={index}
      slides={images.map((url) => ({ src: url }))}
      plugins={[Zoom, Thumbnails]}
      zoom={{
        maxZoomPixelRatio: 3,
        zoomInMultiplier: 2,
        doubleTapDelay: 300,
        doubleClickDelay: 300,
        doubleClickMaxStops: 2,
        keyboardMoveDistance: 50,
        wheelZoomDistanceFactor: 100,
        pinchZoomDistanceFactor: 100,
        scrollToZoom: true,
      }}
      on={{
        view: ({ index: nextIndex }) => setIndex(nextIndex),
      }}
    />
  );
}
