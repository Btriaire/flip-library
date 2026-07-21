"use client";

import { DEFAULT_ENVIRONMENTS, EnvironmentKey, EnvironmentsState, FeedItem } from "./types";

// Persistence layer. Firestore isn't wired in yet — it needs a Firebase
// project config from Bruno (see lib/firebase.ts). localStorage keeps the
// app fully usable in the meantime; swapping in Firestore later only means
// changing the bodies of these functions, not their call sites.

const ENV_KEY = "flip-library:environments";
const SAVED_KEY = "flip-library:saved";
const SEEN_KEY = "flip-library:seen";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getEnvironments(): EnvironmentsState {
  return read(ENV_KEY, DEFAULT_ENVIRONMENTS);
}

export function saveEnvironments(state: EnvironmentsState) {
  write(ENV_KEY, state);
}

export function addTag(env: EnvironmentKey, tag: string): EnvironmentsState {
  const state = getEnvironments();
  const clean = tag.trim();
  if (clean && !state[env].tags.includes(clean)) {
    state[env] = { ...state[env], tags: [...state[env].tags, clean] };
    saveEnvironments(state);
  }
  return state;
}

export function removeTag(env: EnvironmentKey, tag: string): EnvironmentsState {
  const state = getEnvironments();
  state[env] = { ...state[env], tags: state[env].tags.filter((t) => t !== tag) };
  saveEnvironments(state);
  return state;
}

export function setAiSuggestedTags(env: EnvironmentKey, tags: string[]): EnvironmentsState {
  const state = getEnvironments();
  state[env] = { ...state[env], aiSuggestedTags: tags };
  saveEnvironments(state);
  return state;
}

export function getSaved(): FeedItem[] {
  return read(SAVED_KEY, []);
}

export function toggleSaved(item: FeedItem): FeedItem[] {
  const saved = getSaved();
  const exists = saved.some((i) => i.id === item.id);
  const next = exists ? saved.filter((i) => i.id !== item.id) : [item, ...saved];
  write(SAVED_KEY, next);
  return next;
}

export function isSaved(id: string): boolean {
  return getSaved().some((i) => i.id === id);
}

export function getSeen(): string[] {
  return read(SEEN_KEY, []);
}

export function markSeen(id: string) {
  const seen = getSeen();
  if (!seen.includes(id)) write(SEEN_KEY, [...seen, id].slice(-500));
}
