import type { Metadata } from "next";

// A distinct manifest/icon pair (see public/camera-manifest.webmanifest and
// ./icon.tsx) so "Add to Home Screen" from here installs as its own app —
// "Flip Cam" — separate from the news-reader shortcut the rest of this
// project installs as.
export const metadata: Metadata = {
  title: "Flip Cam",
  description: "Appareil photo ultra-optimisé — capture pleine résolution, styles vintage, édition non destructive",
  manifest: "/camera-manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Flip Cam",
  },
};

export const viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function CameraLayout({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 bg-black">{children}</div>;
}
