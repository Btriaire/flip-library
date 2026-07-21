"use client";

import { EnvironmentKey, ENVIRONMENTS } from "@/lib/types";

export default function EnvironmentTabs({
  active,
  onChange,
}: {
  active: EnvironmentKey;
  onChange: (key: EnvironmentKey) => void;
}) {
  return (
    <div className="flex justify-center gap-1 px-4 pt-3 pb-2 shrink-0">
      {ENVIRONMENTS.map((env) => (
        <button
          key={env.key}
          onClick={() => onChange(env.key)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            active === env.key
              ? "bg-white text-black"
              : "bg-white/10 text-white/70 hover:bg-white/20"
          }`}
        >
          {env.label}
        </button>
      ))}
    </div>
  );
}
