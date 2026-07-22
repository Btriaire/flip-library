"use client";

import { ArticleItem } from "@/lib/types";
import { CloseIcon } from "./Icons";

export default function ArticleReader({ item, onClose }: { item: ArticleItem; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-zinc-950 text-white overflow-y-auto"
      style={{
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
      }}
    >
      <div className="flex items-center justify-between px-4 mb-2">
        <button onClick={onClose} className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center">
          <CloseIcon className="w-4 h-4" />
        </button>
        <span className="text-xs text-white/50 uppercase tracking-wide">{item.source}</span>
      </div>

      <div className="px-5 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold leading-tight [font-family:Georgia,serif] mt-2">{item.title}</h1>
        {item.byline && <p className="text-sm text-white/50 mt-2">{item.byline}</p>}
        {item.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt="" className="w-full rounded-xl mt-4 object-cover max-h-64" />
        )}
        {item.fullTextIsHtml ? (
          <div
            className="reader-content mt-6 text-[17px] leading-relaxed text-white/90 [&_a]:underline [&_p]:mb-4"
            dangerouslySetInnerHTML={{ __html: item.fullText || "" }}
          />
        ) : (
          <p className="mt-6 text-[17px] leading-relaxed text-white/90 whitespace-pre-line">
            {item.fullText}
          </p>
        )}
        <div className="mt-6 mb-4 text-sm text-white/50">
          {item.license && <p className="mb-2">Contenu {item.license} — {item.source}</p>}
          {item.sources && item.sources.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {item.sources.map((s, i) => (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  [{i + 1}] {s.title}
                </a>
              ))}
            </div>
          ) : (
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="underline">
              Voir l&apos;article complet sur {item.source} ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
