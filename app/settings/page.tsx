"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EnvironmentKey, ENVIRONMENTS, EnvironmentsState } from "@/lib/types";
import { getEnvironments, addTag, removeTag, setAiSuggestedTags } from "@/lib/store";
import { BackIcon, CloseIcon, SparkleIcon, PlusIcon } from "@/components/Icons";

export default function Settings() {
  const [state, setState] = useState<EnvironmentsState | null>(null);
  const [inputs, setInputs] = useState<Record<EnvironmentKey, string>>({
    perso: "",
    pro: "",
    other: "",
  });
  const [suggesting, setSuggesting] = useState<EnvironmentKey | null>(null);

  useEffect(() => {
    setState(getEnvironments());
  }, []);

  if (!state) return null;

  const handleAdd = (env: EnvironmentKey) => {
    const value = inputs[env];
    if (!value.trim()) return;
    setState(addTag(env, value));
    setInputs((i) => ({ ...i, [env]: "" }));
  };

  const handleRemove = (env: EnvironmentKey, tag: string) => {
    setState(removeTag(env, tag));
  };

  const handleSuggest = async (env: EnvironmentKey) => {
    setSuggesting(env);
    try {
      const res = await fetch("/api/jarvis/suggest-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ environment: env, existingTags: state[env].tags }),
      });
      const data = await res.json();
      setState(setAiSuggestedTags(env, data.suggestions || []));
    } catch {
      setState(setAiSuggestedTags(env, []));
    } finally {
      setSuggesting(null);
    }
  };

  const acceptSuggestion = (env: EnvironmentKey, tag: string) => {
    const next = addTag(env, tag);
    setState(setAiSuggestedTags(env, next[env].aiSuggestedTags.filter((t) => t !== tag)));
  };

  return (
    <div
      className="flex flex-col flex-1 h-dvh overflow-y-auto bg-zinc-950 text-white px-4 gap-8"
      style={{
        paddingTop: "max(1.5rem, env(safe-area-inset-top))",
        paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
      }}
    >
      <div className="flex items-center gap-3">
        <Link href="/" className="text-white/60 p-1">
          <BackIcon />
        </Link>
        <h1 className="text-xl font-semibold">Centres d&apos;intérêt</h1>
      </div>

      {ENVIRONMENTS.map((env) => (
        <section key={env.key} className="flex flex-col gap-3">
          <h2 className="text-sm uppercase tracking-wide text-white/50">{env.label}</h2>

          <div className="flex flex-wrap gap-2">
            {state[env.key].tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 bg-white/10 rounded-full px-3 py-1 text-sm"
              >
                {tag}
                <button onClick={() => handleRemove(env.key, tag)} className="text-white/50 p-0.5">
                  <CloseIcon />
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={inputs[env.key]}
              onChange={(e) => setInputs((i) => ({ ...i, [env.key]: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && handleAdd(env.key)}
              placeholder="Ajouter un centre d'intérêt…"
              className="flex-1 bg-white/5 rounded-full px-4 py-2 text-sm outline-none"
            />
            <button
              onClick={() => handleAdd(env.key)}
              className="px-4 py-2 rounded-full bg-white text-black flex items-center justify-center"
              aria-label="Ajouter"
            >
              <PlusIcon />
            </button>
          </div>

          <button
            onClick={() => handleSuggest(env.key)}
            disabled={suggesting === env.key}
            className="self-start flex items-center gap-1.5 text-sm text-white/60 border border-white/20 rounded-full px-3 py-1.5"
          >
            <SparkleIcon />
            {suggesting === env.key ? "Jarvis réfléchit…" : "Suggérer avec l'IA"}
          </button>

          {state[env.key].aiSuggestedTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {state[env.key].aiSuggestedTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => acceptSuggestion(env.key, tag)}
                  className="flex items-center gap-1 text-sm border border-dashed border-white/30 rounded-full px-3 py-1 text-white/70"
                >
                  <PlusIcon className="w-3 h-3" /> {tag}
                </button>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
