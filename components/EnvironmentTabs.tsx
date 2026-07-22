"use client";

import { EnvironmentKey, ENVIRONMENTS } from "@/lib/types";

export type TabKey = EnvironmentKey | "presse";

export default function EnvironmentTabs({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (key: TabKey) => void;
}) {
  const tabs: { key: TabKey; label: string }[] = [
    ...ENVIRONMENTS,
    { key: "presse", label: "📰 Presse" },
  ];

  return (
    <div className="flex justify-center gap-1 px-4 pt-3 pb-2 shrink-0">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            active === tab.key
              ? "bg-white text-black"
              : "bg-white/10 text-white/70 hover:bg-white/20"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
