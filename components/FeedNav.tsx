"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { FEEDS, FeedKey } from "@/lib/types";
import { FeedIcon, SettingsIcon } from "./Icons";

// Top access bar, Apple News style: large masthead + a horizontally
// scrollable row of icon pills that sits over the card deck.
export default function FeedNav({
  active,
  onChange,
}: {
  active: FeedKey;
  onChange: (key: FeedKey) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);

  // Keep the selected pill in view when the feed changes from elsewhere
  // (or when the active one sits off-screen on a narrow phone).
  useEffect(() => {
    const rail = railRef.current;
    const pill = rail?.querySelector<HTMLElement>(`[data-feed="${active}"]`);
    pill?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [active]);

  return (
    <header className="bg-gradient-to-b from-black via-black/85 to-transparent pb-2">
      <div
        className="flex items-center justify-between px-4 pb-2"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <h1 className="text-[26px] font-bold leading-none tracking-tight [font-family:Georgia,serif]">
          Flip-PaLaMa
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            aria-label="Réglages"
            className="rounded-full bg-white/10 p-2 text-white/80 active:bg-white/20"
          >
            <SettingsIcon />
          </Link>
        </div>
      </div>

      <nav
        ref={railRef}
        aria-label="Flux"
        className="flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {FEEDS.map((feed) => {
          const isActive = active === feed.key;
          return (
            <button
              key={feed.key}
              data-feed={feed.key}
              onClick={() => onChange(feed.key)}
              aria-current={isActive ? "page" : undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-white bg-white text-black"
                  : "border-white/15 bg-white/10 text-white/70 active:bg-white/20"
              }`}
            >
              <FeedIcon name={feed.icon} className="h-4 w-4" />
              {feed.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
