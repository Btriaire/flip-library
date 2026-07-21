"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import EnvironmentTabs from "@/components/EnvironmentTabs";
import CardDeck from "@/components/CardDeck";
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
    <div className="flex flex-col flex-1 h-dvh bg-zinc-950 text-white">
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="font-semibold text-lg tracking-tight">Flip Library</span>
        <Link href="/settings" className="text-white/60 text-xl" aria-label="Réglages">
          ⚙
        </Link>
      </div>
      <EnvironmentTabs active={active} onChange={setActive} />
      <CardDeck items={items} loading={loading} />
    </div>
  );
}
