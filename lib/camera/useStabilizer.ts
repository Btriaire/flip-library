"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Electronic stabilization for the live viewfinder only: a web page can't
// move a lens element, so this borrows the same trick real EIS uses once
// you take the lens out of it -- crop in for margin, then shift that crop
// opposite to the phone's own jitter so the framing looks steadier than the
// hand holding it. It only smooths what you SEE while composing; a capture
// still grabs the plain, uncropped frame via useCamera's own capture path.
//
// Android and desktop Chrome fire 'deviceorientation' the moment something
// listens. iOS 13+ Safari gates it behind DeviceOrientationEvent.requestPermission(),
// which only resolves when called from a user-gesture handler -- that's
// what requestAccess() is for; call it from the toggle button's onClick.
//
// beta/gamma feed refs, not state: orientation events fire far more often
// than the preview needs new renders, and the render loop that reads these
// (Viewfinder's rAF loop) already reads other fast-changing values the same
// way, precisely to avoid a render storm.
export type Stabilizer = {
  available: boolean;
  // Mirrors `available` into a ref for the long-lived rAF closure in
  // Viewfinder's render loop -- that effect doesn't list this hook's return
  // value in its dependency array (recreating the whole WebGL context every
  // time a sensor event fires would be absurd), so it needs a ref to read
  // the live value instead of the one from whenever the effect last ran.
  availableRef: React.RefObject<boolean>;
  // Each roughly in [-1, 1]: how far current orientation has drifted from
  // the slow-moving baseline, saturating at SHAKE_DEADZONE_DEG of tilt. The
  // caller decides how many pixels of crop margin that maps to.
  shakeXRef: React.RefObject<number>;
  shakeYRef: React.RefObject<number>;
  requestAccess: () => Promise<boolean>;
};

type PermissionGatedDeviceOrientation = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

const BASELINE_SMOOTHING = 0.02; // per-sample EMA weight -- slow, tracks intentional framing, not shake
const SHAKE_DEADZONE_DEG = 4; // tilt delta from baseline that saturates the compensation

export function useStabilizer(): Stabilizer {
  const [available, setAvailable] = useState(false);
  const availableRef = useRef(false);
  const shakeXRef = useRef(0);
  const shakeYRef = useRef(0);
  const baseline = useRef<{ beta: number; gamma: number } | null>(null);
  const listenerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null);

  const attach = useCallback(() => {
    if (listenerRef.current) return;
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return;
      if (!availableRef.current) {
        availableRef.current = true;
        setAvailable(true);
      }
      if (!baseline.current) {
        baseline.current = { beta: e.beta, gamma: e.gamma };
        return;
      }
      baseline.current.beta += (e.beta - baseline.current.beta) * BASELINE_SMOOTHING;
      baseline.current.gamma += (e.gamma - baseline.current.gamma) * BASELINE_SMOOTHING;
      const deltaBeta = e.beta - baseline.current.beta;
      const deltaGamma = e.gamma - baseline.current.gamma;
      shakeYRef.current = Math.max(-1, Math.min(1, deltaBeta / SHAKE_DEADZONE_DEG));
      shakeXRef.current = Math.max(-1, Math.min(1, deltaGamma / SHAKE_DEADZONE_DEG));
    };
    listenerRef.current = onOrientation;
    window.addEventListener("deviceorientation", onOrientation);
  }, []);

  useEffect(() => {
    if (typeof DeviceOrientationEvent === "undefined") return;
    const gated = typeof (DeviceOrientationEvent as PermissionGatedDeviceOrientation).requestPermission === "function";
    if (!gated) attach();
    return () => {
      if (listenerRef.current) {
        window.removeEventListener("deviceorientation", listenerRef.current);
        listenerRef.current = null;
      }
    };
  }, [attach]);

  const requestAccess = useCallback(async () => {
    if (typeof DeviceOrientationEvent === "undefined") return false;
    const requestPermission = (DeviceOrientationEvent as PermissionGatedDeviceOrientation).requestPermission;
    if (typeof requestPermission === "function") {
      try {
        if ((await requestPermission()) !== "granted") return false;
      } catch {
        return false;
      }
    }
    attach();
    return true;
  }, [attach]);

  return { available, availableRef, shakeXRef, shakeYRef, requestAccess };
}
