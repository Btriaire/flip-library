"use client";

import { useEffect, useRef, useState } from "react";
import { useCamera } from "@/lib/camera/useCamera";
import { useStabilizer } from "@/lib/camera/useStabilizer";
import { GLRenderer } from "@/lib/camera/gl/renderer";
import { Adjustments, NEUTRAL_ADJUSTMENTS } from "@/lib/camera/types";
import { PRESETS } from "@/lib/camera/presets";
import { CameraIcon, FlashIcon, FlipCameraIcon, GalleryGridIcon, StabilizerIcon } from "@/components/Icons";

// Crop-in fraction applied to the live preview when each stabilizer level
// is on -- how much headroom the shake-compensation shift has to work
// with. Ultra crops in further, trading field of view for a bigger
// correction range against the same amount of hand shake.
type StabilizerMode = "off" | "standard" | "ultra";
const STABILIZER_ZOOM = 1.1;
const ULTRA_STABILIZER_ZOOM = 1.25;

// Live viewfinder: shows the camera feed through the same WebGL filter
// pipeline used for the final export, so the vintage-camera look you frame
// with is the look you get — no surprise after the shutter. The preview
// texture is capped at 1080 on its long edge for a smooth 60fps loop; the
// actual capture (see useCamera.capture) grabs a full independent still at
// the sensor's native resolution, unrelated to this preview's size.
export default function Viewfinder({
  presetId,
  onSelectPreset,
  onCapture,
  onOpenGallery,
}: {
  presetId: string | null;
  onSelectPreset: (id: string | null) => void;
  onCapture: (bitmap: ImageBitmap, width: number, height: number) => void;
  onOpenGallery: () => void;
}) {
  const {
    videoRef,
    ready,
    error,
    capabilities,
    torchOn,
    setTorch,
    zoom,
    setZoom,
    flip,
    capture,
  } = useCamera();
  const stabilizer = useStabilizer();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<GLRenderer | null>(null);
  const rafRef = useRef<number | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [stabilizerMode, setStabilizerMode] = useState<StabilizerMode>("off");
  const stabModeRef = useRef<StabilizerMode>("off");

  const preset = PRESETS.find((p) => p.id === presetId) ?? null;
  const adjustments: Adjustments = { ...NEUTRAL_ADJUSTMENTS, ...preset?.adjustments };

  useEffect(() => {
    stabModeRef.current = stabilizerMode;
  }, [stabilizerMode]);

  const handleToggleStabilizer = (mode: "standard" | "ultra") => {
    const next = stabilizerMode === mode ? "off" : mode;
    setStabilizerMode(next);
    if (next !== "off") void stabilizer.requestAccess();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !ready) return;

    try {
      rendererRef.current = new GLRenderer(canvas);
    } catch {
      return;
    }
    if (!cropCanvasRef.current) cropCanvasRef.current = document.createElement("canvas");

    let seed = 0;
    const loop = () => {
      const renderer = rendererRef.current;
      const crop = cropCanvasRef.current;
      if (renderer && crop && video && video.readyState >= 2 && video.videoWidth > 0) {
        const scale = Math.min(1, 1080 / Math.max(video.videoWidth, video.videoHeight));
        const w = Math.round(video.videoWidth * scale);
        const h = Math.round(video.videoHeight * scale);

        const stabZoom =
          stabModeRef.current === "ultra" ? ULTRA_STABILIZER_ZOOM : stabModeRef.current === "standard" ? STABILIZER_ZOOM : 1;
        const ctx = stabZoom > 1 && stabilizer.availableRef.current ? crop.getContext("2d") : null;
        if (ctx) {
          if (crop.width !== w || crop.height !== h) {
            crop.width = w;
            crop.height = h;
          }
          // Crop to a smaller-than-source window, then slide that window
          // opposite the phone's own drift (shakeX/Y) so the framing holds
          // steady. The shift budget comes only from this stabilizer's own
          // margin, not any other cropping, so it never fights other framing.
          const cropW = video.videoWidth / stabZoom;
          const cropH = video.videoHeight / stabZoom;
          const marginX = (video.videoWidth - cropW) / 2;
          const marginY = (video.videoHeight - cropH) / 2;
          const sx = marginX * (1 - stabilizer.shakeXRef.current);
          const sy = marginY * (1 - stabilizer.shakeYRef.current);
          ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, w, h);
          renderer.uploadSource(crop, w, h);
        } else {
          renderer.uploadSource(video, w, h);
        }
        renderer.render(adjustments, seed);
        seed += 0.016;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, presetId]);

  const handleShutter = async () => {
    if (capturing) return;
    setCapturing(true);
    try {
      const shot = await capture();
      if (shot) onCapture(shot.bitmap, shot.width, shot.height);
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div className="relative flex-1 h-dvh bg-black overflow-hidden">
      <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover opacity-0" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-cover" />

      {error && (
        <div className="absolute inset-0 flex items-center justify-center px-8 text-center text-white/70">
          {error}
        </div>
      )}

      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button
          onClick={onOpenGallery}
          aria-label="Galerie"
          className="rounded-full bg-black/40 p-2.5 text-white backdrop-blur"
        >
          <GalleryGridIcon />
        </button>

        <div className="flex items-center gap-2">
          {capabilities.torch && (
            <button
              onClick={() => setTorch(!torchOn)}
              aria-label="Flash"
              className={`rounded-full p-2.5 backdrop-blur ${
                torchOn ? "bg-white text-black" : "bg-black/40 text-white"
              }`}
            >
              <FlashIcon className="w-5 h-5" off={!torchOn} />
            </button>
          )}
          {capabilities.canSwitch && (
            <button
              onClick={flip}
              aria-label="Changer de caméra"
              className="rounded-full bg-black/40 p-2.5 text-white backdrop-blur"
            >
              <FlipCameraIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {capabilities.zoom && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 rounded-full bg-black/40 px-1.5 py-3 backdrop-blur">
          <input
            type="range"
            aria-label="Zoom"
            min={capabilities.zoom.min}
            max={capabilities.zoom.max}
            step={capabilities.zoom.step}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-28 accent-white"
            style={{ writingMode: "vertical-lr" as React.CSSProperties["writingMode"], direction: "rtl" }}
          />
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => handleToggleStabilizer("standard")}
            aria-pressed={stabilizerMode === "standard"}
            aria-label="Stabilisateur"
            className={`shrink-0 flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium ${
              stabilizerMode === "standard" ? "border-white bg-white text-black" : "border-white/25 bg-black/30 text-white/80"
            }`}
          >
            <StabilizerIcon className="w-4 h-4" />
            Stabilisateur
          </button>
          <button
            onClick={() => handleToggleStabilizer("ultra")}
            aria-pressed={stabilizerMode === "ultra"}
            aria-label="Ultra-stabilisateur"
            className={`shrink-0 flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium ${
              stabilizerMode === "ultra" ? "border-white bg-white text-black" : "border-white/25 bg-black/30 text-white/80"
            }`}
          >
            <StabilizerIcon className="w-4 h-4" ultra />
            Ultra-stabilisateur
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => onSelectPreset(null)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium ${
              presetId === null ? "border-white bg-white text-black" : "border-white/25 bg-black/30 text-white/80"
            }`}
          >
            Naturel
          </button>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelectPreset(p.id)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium ${
                presetId === p.id ? "border-white bg-white text-black" : "border-white/25 bg-black/30 text-white/80"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-center pb-2">
          <button
            onClick={handleShutter}
            disabled={!ready || capturing}
            aria-label="Déclencher"
            className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white/80 disabled:opacity-40"
          >
            <span className={`h-14 w-14 rounded-full bg-white transition-transform ${capturing ? "scale-75" : ""}`} />
          </button>
        </div>
      </div>

      {!ready && !error && (
        <div className="absolute inset-0 flex items-center justify-center text-white/50">
          <CameraIcon className="w-10 h-10 animate-pulse" />
        </div>
      )}
    </div>
  );
}
