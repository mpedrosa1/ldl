"use client";

import { useEffect, useState } from "react";

/** Loads an image URL into an HTMLImageElement for use as a Konva.Image `image` prop. */
export function useHtmlImage(url?: string): HTMLImageElement | undefined {
  const [img, setImg] = useState<HTMLImageElement>();

  useEffect(() => {
    if (!url) {
      // Synchronizes state with the `url` prop: clears the previously loaded image.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setImg(undefined);
      return;
    }
    const image = new window.Image();
    image.onload = () => setImg(image);
    image.src = url;
    return () => {
      image.onload = null;
    };
  }, [url]);

  return img;
}
