import { useEffect, useState } from "react";
import { ArticleItem } from "@/lib/types";
import { ArticleIcon, HeartIcon, ShareIcon } from "./Icons";
import SmartImage from "./SmartImage";
import ArticleReader from "./ArticleReader";

export default function ArticleCard({
  item,
  active,
  saved,
  onToggleSave,
}: {
  item: ArticleItem;
  active: boolean;
  saved: boolean;
  onToggleSave: () => void;
}) {
  // Full-text sources (The Conversation, NEWPI) can be read in-app.
  const hasFullText = !!item.fullText;

  const [image, setImage] = useState(item.image);
  const [reading, setReading] = useState(false);

  useEffect(() => {
    if (image || !active) return;
    let cancelled = false;
    fetch(`/api/articles/image?url=${encodeURIComponent(item.url)}`)
      .then((res) => res.json())
      .then((data) => !cancelled && data.image && setImage(data.image))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [active, image, item.url]);

  // Longest text we can legitimately show, in order of preference.
  const summary = item.fullText
    ? item.fullText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 900)
    : item.excerpt;

  // Feeds range from a bare headline to a full body, so the badge says which
  // one this card actually got rather than promising the same everywhere.
  const depth = hasFullText ? "full" : summary.length >= 400 ? "long" : "short";

  const share = () => {
    if (navigator.share) navigator.share({ title: item.title, url: item.url }).catch(() => {});
    else window.open(item.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="relative h-full w-full bg-zinc-900 text-white overflow-hidden">
      {image ? (
        <SmartImage src={image} />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white/20 bg-zinc-800">
          <ArticleIcon className="w-16 h-16" />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />

      {item.fullText ? (
        <button
          onClick={() => setReading(true)}
          className="absolute inset-0"
          aria-label={item.title}
        />
      ) : (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0"
          aria-label={item.title}
        />
      )}

      <div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black pointer-events-none"
        style={{ bottom: "0" }}
      />

      <div
        className="absolute bottom-0 left-0 right-0 p-6 pointer-events-none space-y-3 max-h-2/3"
        style={{ paddingBottom: "calc(3.75rem + env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center gap-2">
          {depth === "full" ? (
            <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-medium">
              ✓ Article complet
            </span>
          ) : depth === "long" ? (
            <span className="text-xs bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full font-medium">
              ✦ Extrait long
            </span>
          ) : (
            <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-medium">
              ↗ Extrait court — lien externe
            </span>
          )}
        </div>
        <h2 className="text-2xl font-bold leading-tight [font-family:Georgia,serif] line-clamp-2">
          {item.title}
        </h2>
        {/* The overlay can't scroll (it must stay transparent to the swipe),
            so the teaser is clamped to what fits rather than cut mid-line. */}
        <p className="text-lg text-white/80 leading-relaxed font-light line-clamp-[10]">
          {summary}
        </p>
        <div className="flex items-center justify-between text-xs text-white/50 pt-3 border-t border-white/10">
          <span className="font-medium">{item.source}</span>
          {item.byline && <span>{item.byline}</span>}
        </div>

        <div className="flex items-center gap-5 mt-4 pointer-events-auto">
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggleSave();
            }}
            aria-label="Sauvegarder"
            className={saved ? "text-red-400" : "text-white/80"}
          >
            <HeartIcon filled={saved} />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              share();
            }}
            aria-label="Partager"
            className="text-white/80"
          >
            <ShareIcon />
          </button>
        </div>
      </div>

      {reading && item.fullText && <ArticleReader item={item} onClose={() => setReading(false)} />}
    </div>
  );
}
