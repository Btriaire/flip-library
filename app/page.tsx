"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import EnvironmentTabs from "@/components/EnvironmentTabs";
import CardDeck from "@/components/CardDeck";
import { SettingsIcon } from "@/components/Icons";
import { EnvironmentKey, FeedItem } from "@/lib/types";
import { getEnvironments } from "@/lib/store";
import { loadFeed } from "@/lib/feed";

export default function Home() {
  const [active, setActive] = useState<EnvironmentKey>("perso");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const config = getEnvironments()[active];
    loadFeed(config).then((feed) => {
      if (!cancelled) {
        setItems(feed);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [active]);

  return (
    <div className="relative flex-1 h-dvh bg-zinc-950 text-white overscroll-none overflow-hidden">
      <CardDeck items={items} loading={loading} />

      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
        <div
          className="flex items-center justify-between px-4 pointer-events-auto"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <span className="font-semibold text-lg tracking-tight [font-family:Georgia,serif]">
            Flip-PaLaMa
          </span>
          <Link href="/settings" className="text-white/80 p-1" aria-label="Réglages">
            <SettingsIcon />
          </Link>
        </div>
        <div className="pointer-events-auto">
          <EnvironmentTabs active={active} onChange={setActive} />
        </div>
      </div>
    </div>
  );
}
