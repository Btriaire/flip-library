import { VideoItem } from "@/lib/types";
import { VideoIcon, HeartIcon, ShareIcon } from "./Icons";

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
  const share = () => {
    const url = item.source === "youtube" ? item.embedUrl.split("?")[0].replace("/embed/", "/watch?v=") : item.embedUrl;
    if (navigator.share) navigator.share({ title: item.title, url }).catch(() => {});
    else window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="relative h-full w-full bg-black text-white overflow-hidden">
      {active ? (
        <iframe
          src={item.embedUrl}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : item.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white/20">
          <VideoIcon className="w-16 h-16" />
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none" />

      <div
        className="absolute bottom-0 left-0 right-0 p-5"
        style={{ paddingBottom: "calc(3.75rem + env(safe-area-inset-bottom))" }}
      >
        <span className="text-xs bg-white/15 px-2 py-1 rounded-full">
          {item.source === "youtube" ? "YouTube" : "Twitch"}
        </span>
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
