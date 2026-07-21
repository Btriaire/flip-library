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

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10" />

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
        className="absolute bottom-0 left-0 right-0 p-5 pointer-events-none"
        style={{ paddingBottom: "calc(3.75rem + env(safe-area-inset-bottom))" }}
      >
        <h2 className="text-2xl font-bold leading-tight [font-family:Georgia,serif] line-clamp-4">
          {item.title}
        </h2>
        <p className="text-sm text-white/60 mt-2">{item.source}</p>

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
