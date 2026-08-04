"use client";

import { useEffect, useState } from "react";
import FeedNav from "@/components/FeedNav";
import CardDeck from "@/components/CardDeck";
import { FeedItem, FeedKey } from "@/lib/types";
import { getEnvironments } from "@/lib/store";
import { loadFeed } from "@/lib/feed";
import { loadNewpiFeed } from "@/lib/newpi";
import { loadShorts } from "@/lib/shorts";

export default function Home() {
  const [active, setActive] = useState<FeedKey>("presse");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    let load: Promise<FeedItem[]>;
    if (active === "presse") load = loadNewpiFeed();
    else if (active === "shorts") load = loadShorts();
    else load = loadFeed(getEnvironments()[active]);

    load.then((feed) => {
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

      <div className="absolute top-0 left-0 right-0 z-40">
        <FeedNav active={active} onChange={setActive} />
      </div>
    </div>
  );
}
