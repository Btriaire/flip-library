import { useEffect, useState } from "react";
import { VideoItem } from "@/lib/types";
import { VideoIcon, HeartIcon, ShareIcon } from "./Icons";
import SmartImage from "./SmartImage";

// Two rounds of iOS-specific autoplay fixes (playsinline, youtube-nocookie)
// still left Shorts blank on a real iPhone — Safari's autoplay/tracking
// policies are too much of a moving target to chase blind without a device
// to test on. Tap-to-play sidesteps the whole category: nothing ever tries
// to autoplay, so no browser's autoplay policy is ever in play. A tap is a
// direct user gesture, which every browser allows unconditionally.
export default function VideoCard({
  item,
  active,
  saved,
  onToggleSave,
}: {
  item: VideoItem;
  active: boolean;
  saved: boolean;
  onToggleSave: () => void;
}) {
  const [playing, setPlaying] = useState(false);

  // A fresh card (new item.id) always starts paused, even if a previous
  // card was mid-play when the user swiped past it.
  useEffect(() => {
    setPlaying(false);
  }, [item.id]);

  const share = () => {
    const url = item.source === "youtube" ? item.embedUrl.split("?")[0].replace("/embed/", "/watch?v=") : item.embedUrl;
    if (navigator.share) navigator.share({ title: item.title, url }).catch(() => {});
    else window.open(url, "_blank", "noopener,noreferrer");
  };

  // X blocks iframing its status pages, so a tweet never uses the iframe path:
  // its own mp4 plays natively, and a photo/text post shows the still image.
  const isTweet = item.source === "twitter";
  const label = item.source === "youtube" ? "YouTube" : item.source === "twitch" ? "Twitch" : "X";
  const canPlay = active && (isTweet ? !!item.mp4 : true);

  return (
    <div className="relative h-full w-full bg-black text-white overflow-hidden">
      {playing && canPlay ? (
        isTweet ? (
          <video
            src={item.mp4}
            poster={item.thumbnail ?? undefined}
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <iframe
            src={item.embedUrl}
            className="absolute inset-0 h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        )
      ) : item.thumbnail ? (
        <SmartImage src={item.thumbnail} />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white/20">
          <VideoIcon className="w-16 h-16" />
        </div>
      )}

      {(!playing || !canPlay) && (
        <button
          onClick={() => setPlaying(true)}
          aria-label="Lire la vidéo"
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50 backdrop-blur">
            <svg viewBox="0 0 24 24" className="h-7 w-7 translate-x-0.5" fill="white">
              <path d="M8 5v14l11-7L8 5Z" />
            </svg>
          </span>
        </button>
      )}

      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none" />

      <div
        className="absolute bottom-0 left-0 right-0 p-5"
        style={{ paddingBottom: "calc(3.75rem + env(safe-area-inset-bottom))" }}
      >
        <span className="text-xs bg-white/15 px-2 py-1 rounded-full">{label}</span>
        <h2 className="text-xl font-bold leading-tight [font-family:Georgia,serif] mt-2 line-clamp-3">
          {item.title}
        </h2>
        <p className="text-sm text-white/60 mt-1">{item.channel}</p>

        <div className="flex items-center gap-5 mt-4">
          <button
            onClick={onToggleSave}
            aria-label="Sauvegarder"
            className={saved ? "text-red-400" : "text-white/80"}
          >
            <HeartIcon filled={saved} />
          </button>
          <button onClick={share} aria-label="Partager" className="text-white/80">
            <ShareIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
