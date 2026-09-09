This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Flip Cam (`/camera`)

A second installable app living in this same project: a camera + editor meant
to replace the stock iPhone camera app for day-to-day shooting.

- **Capture** — `lib/camera/useCamera.ts` asks `getUserMedia` for the largest
  frame the device offers, then prefers the `ImageCapture` API's
  `takePhoto()` (requested at its reported max size) for the still itself —
  on Android Chrome this taps the camera pipeline directly and can return a
  photo well above the viewfinder's own preview resolution. Falls back to
  grabbing the live video frame where `ImageCapture` isn't available
  (notably, all of iOS Safari today).
- **Honesty about "RAW"**: no browser exposes the sensor's raw Bayer data —
  `ImageCapture`/`getUserMedia` only ever hand back already-processed
  frames. "Maximum resolution" here means the highest still the platform's
  camera pipeline will give a web page, not an actual `.dng`/`.cr2` file.
- **Editing** — `components/camera/Editor.tsx` + `lib/camera/gl/` run every
  adjustment (exposure, contrast, curves, white balance, sharpen/denoise,
  vignette, grain, chromatic aberration, scanlines, light leaks…) as one
  WebGL shader (`lib/camera/gl/shaders.ts`). It's non-destructive: only the
  parameter stack is kept in state, and every render — live preview or final
  export — starts back from the untouched source and reapplies the full
  stack, so nothing is ever baked in early.
- **Styles** — `lib/camera/presets.ts` ships a baker's dozen of old-camera
  looks (Kodachrome, Polaroid SX-70, Agfa Vista, Ilford HP5, CineStill 800T,
  Lomo LC-A, Holga, VHS, security-cam, daguerreotype…), each just a set of
  the same adjustment values, so every look stays tweakable afterwards.
- **Library** — `app/api/photos/route.ts` stores saved shots as plain files
  on the VPS (`PHOTOS_DIR`, see `.env.example` / `docker-compose.yml`), each
  with a JSON sidecar holding the adjustment stack that produced it.
- **Installable separately** — `/camera` ships its own manifest/icons
  (`public/camera-manifest.webmanifest`, `app/camera/icon.tsx`), so "Add to
  Home Screen" from there installs as "Flip Cam", distinct from this
  project's news-reader shortcut.

Not done: there's no offline service worker (a hand-rolled one for a hashed
Next.js build risked serving stale chunks after a deploy — a proper one
wants `next-pwa`/Serwist), and tap-to-focus isn't wired up (`focusMode`
support is too inconsistent across browsers to be worth it yet).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
