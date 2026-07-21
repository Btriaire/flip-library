"use client";

import { useState } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { FeedItem } from "@/lib/types";
import ArticleCard from "./ArticleCard";
import VideoCard from "./VideoCard";
import { toggleSaved, isSaved, markSeen } from "@/lib/store";

const SWIPE_THRESHOLD = 80;

export default function CardDeck({ items, loading }: { items: FeedItem[]; loading: boolean }) {
  const [index, setIndex] = useState(0);
  const [, forceUpdate] = useState(0);

  const advance = (dir: 1 | -1) => {
    setIndex((i) => {
      const next = i + dir;
      if (next < 0 || next >= items.length) return i;
      markSeen(items[i].id);
      return next;
    });
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y < -SWIPE_THRESHOLD) advance(1);
    else if (info.offset.y > SWIPE_THRESHOLD) advance(-1);
  };

  const handleSave = (item: FeedItem) => {
    toggleSaved(item);
    forceUpdate((n) => n + 1);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/50">
        Chargement du flux…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-white/50 gap-2 px-8 text-center">
        <p>Aucun contenu pour l&apos;instant.</p>
        <p className="text-sm">Ajoute des centres d&apos;intérêt dans les réglages.</p>
      </div>
    );
  }

  const current = items[index];

  return (
    <div className="flex-1 relative overflow-hidden px-4 pb-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          className="absolute inset-4"
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.4}
          onDragEnd={handleDragEnd}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2 }}
        >
          {current.kind === "article" ? (
            <ArticleCard item={current} />
          ) : (
            <VideoCard item={current} active />
          )}

          <button
            onClick={() => handleSave(current)}
            className="absolute top-3 right-3 h-9 w-9 rounded-full bg-black/50 text-white flex items-center justify-center text-lg"
            aria-label="Sauvegarder"
          >
            {isSaved(current.id) ? "★" : "☆"}
          </button>
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-1 pointer-events-none">
        {items.slice(0, 20).map((it, i) => (
          <span
            key={it.id}
            className={`h-1 w-1 rounded-full ${i === index ? "bg-white" : "bg-white/30"}`}
          />
        ))}
      </div>
    </div>
  );
}
