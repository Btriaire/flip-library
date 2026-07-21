import { VideoItem } from "@/lib/types";
import { VideoIcon } from "./Icons";

export default function VideoCard({ item, active }: { item: VideoItem; active: boolean }) {
  return (
    <div className="flex flex-col h-full w-full bg-black text-white overflow-hidden rounded-2xl relative">
      {active ? (
        <iframe
          src={item.embedUrl}
          className="h-full w-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : item.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.thumbnail} alt="" className="h-full w-full object-cover opacity-70" />
      ) : (
        <div className="h-full w-full flex items-center justify-center text-white/30">
          <VideoIcon />
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
        <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
          {item.source === "youtube" ? "YouTube" : "Twitch"} · {item.tag}
        </span>
        <h2 className="text-lg font-semibold leading-snug mt-1 line-clamp-2">{item.title}</h2>
        <p className="text-sm text-white/60">{item.channel}</p>
      </div>
    </div>
  );
}
