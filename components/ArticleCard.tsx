import { ArticleItem } from "@/lib/types";
import { ArticleIcon } from "./Icons";

export default function ArticleCard({ item }: { item: ArticleItem }) {
  return (
    <div className="flex flex-col h-full w-full bg-zinc-900 text-white overflow-hidden rounded-2xl">
      <div className="relative h-1/2 w-full bg-zinc-800">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-white/30">
            <ArticleIcon />
          </div>
        )}
        <span className="absolute top-3 left-3 text-xs bg-black/60 px-2 py-1 rounded-full">
          {item.tag}
        </span>
      </div>
      <div className="flex-1 flex flex-col p-5 gap-2 overflow-hidden">
        <span className="text-xs text-white/50 uppercase tracking-wide">{item.source}</span>
        <h2 className="text-xl font-semibold leading-snug line-clamp-3">{item.title}</h2>
        <p className="text-sm text-white/70 line-clamp-3">{item.excerpt}</p>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto self-start px-4 py-2 rounded-full bg-white text-black text-sm font-medium"
        >
          Lire l'article
        </a>
      </div>
    </div>
  );
}
