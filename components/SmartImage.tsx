"use client";

import { useState } from "react";

// Below this natural width, stretching the image edge-to-edge on a phone
// screen visibly pixelates it — better to show it at true size over a
// blurred backdrop than force-upscale a low-res thumbnail.
const LOW_RES_THRESHOLD = 700;

export default function SmartImage({ src, alt = "" }: { src: string; alt?: string }) {
  const [lowRes, setLowRes] = useState(false);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth } = e.currentTarget;
    if (naturalWidth > 0 && naturalWidth < LOW_RES_THRESHOLD) setLowRes(true);
  };

  if (!lowRes) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} onLoad={handleLoad} className="absolute inset-0 h-full w-full object-cover" />
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-zinc-900 flex items-center justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover scale-125 blur-3xl opacity-40"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="relative max-h-full max-w-full object-contain" />
    </div>
  );
}
