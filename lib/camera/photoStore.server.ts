import { promises as fs } from "fs";
import path from "path";
import { del, list, put } from "@vercel/blob";
import { SavedPhotoMeta } from "./types";

// Two backends, picked automatically by environment:
//
// - Plain files on disk (the VPS): an <id>.jpg (or .png) next to an
//   <id>.json sidecar with the adjustment stack that produced it. No
//   database -- consistent with the rest of this app (see lib/store.ts),
//   and the original + its edits are just files an admin can back up or
//   rsync. docker-compose.yml mounts PHOTOS_DIR as a persistent volume.
// - Vercel Blob, when BLOB_READ_WRITE_TOKEN is set (auto-injected once a
//   Blob store is connected to the Vercel project): a Vercel function's own
//   disk is wiped between invocations, so the filesystem path would accept
//   every save and then lose it on the very next request. Same <id>.jpg +
//   <id>.json shape, just as two blobs under "photos/" instead of two files
//   in a directory.
const BLOB_ENABLED = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const BLOB_PREFIX = "photos/";

// The turbopackIgnore comment keeps Turbopack's file tracing from treating
// this dynamic path.join as a signal to trace the entire project (see the
// "Encountered unexpected file in NFT list" build warning without it).
const PHOTOS_DIR =
  process.env.PHOTOS_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), ".data", "photos");

async function ensureDir() {
  await fs.mkdir(PHOTOS_DIR, { recursive: true });
}

// IDs are always crypto.randomUUID() (see savePhoto's caller), but GET/DELETE
// take one back from the client as a query param — reject anything that
// isn't that exact shape before it ever reaches a file path or blob prefix.
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function assertValidId(id: string) {
  if (!ID_PATTERN.test(id)) throw new Error("Identifiant de photo invalide");
}

function metaPath(id: string) {
  assertValidId(id);
  return path.join(PHOTOS_DIR, `${id}.json`);
}

function imagePath(id: string, ext: string) {
  assertValidId(id);
  return path.join(PHOTOS_DIR, `${id}.${ext}`);
}

// Vercel sets VERCEL=1 on every deployment there (preview or prod). Once a
// Blob store is connected this warning clears itself -- it's only the
// genuinely non-persistent case (Vercel, no Blob token) that needs flagging
// up front rather than letting it look like a silent bug.
export function getStorageWarning(): string | null {
  if (process.env.VERCEL && !BLOB_ENABLED) {
    return "Ce déploiement Vercel n'a pas de stockage Blob connecté : les photos enregistrées ici ne survivent pas à la requête suivante. Connecte un store dans Vercel → Storage → Create Database → Blob (ou utilise le déploiement VPS) pour une Bibliothèque qui garde vraiment tes photos.";
  }
  return null;
}

async function blobsForId(id: string) {
  assertValidId(id);
  const { blobs } = await list({ prefix: `${BLOB_PREFIX}${id}.` });
  return blobs;
}

export async function listPhotos(): Promise<SavedPhotoMeta[]> {
  if (BLOB_ENABLED) {
    const { blobs } = await list({ prefix: BLOB_PREFIX });
    const metas = await Promise.all(
      blobs
        .filter((b) => b.pathname.endsWith(".json"))
        .map(async (b) => {
          try {
            const res = await fetch(b.url);
            return (await res.json()) as SavedPhotoMeta;
          } catch {
            return null;
          }
        })
    );
    return metas
      .filter((m): m is SavedPhotoMeta => m !== null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  await ensureDir();
  const files = await fs.readdir(PHOTOS_DIR);
  const metas = await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map(async (f) => {
        try {
          const raw = await fs.readFile(path.join(PHOTOS_DIR, f), "utf8");
          return JSON.parse(raw) as SavedPhotoMeta;
        } catch {
          return null;
        }
      })
  );
  return metas
    .filter((m): m is SavedPhotoMeta => m !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function savePhoto(
  id: string,
  buffer: Buffer,
  ext: string,
  meta: SavedPhotoMeta
): Promise<void> {
  if (BLOB_ENABLED) {
    await put(`${BLOB_PREFIX}${id}.${ext}`, buffer, {
      access: "public",
      addRandomSuffix: false,
      contentType: ext === "png" ? "image/png" : "image/jpeg",
    });
    await put(`${BLOB_PREFIX}${id}.json`, JSON.stringify(meta), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    return;
  }

  await ensureDir();
  await fs.writeFile(imagePath(id, ext), buffer);
  await fs.writeFile(metaPath(id), JSON.stringify(meta), "utf8");
}

export async function getPhotoMeta(id: string): Promise<SavedPhotoMeta | null> {
  if (BLOB_ENABLED) {
    const jsonBlob = (await blobsForId(id)).find((b) => b.pathname.endsWith(".json"));
    if (!jsonBlob) return null;
    try {
      const res = await fetch(jsonBlob.url);
      return (await res.json()) as SavedPhotoMeta;
    } catch {
      return null;
    }
  }

  try {
    const raw = await fs.readFile(metaPath(id), "utf8");
    return JSON.parse(raw) as SavedPhotoMeta;
  } catch {
    return null;
  }
}

export async function readPhotoFile(id: string): Promise<{ buffer: Buffer; ext: string } | null> {
  if (BLOB_ENABLED) {
    const imageBlob = (await blobsForId(id)).find((b) => b.pathname.endsWith(".jpg") || b.pathname.endsWith(".png"));
    if (!imageBlob) return null;
    const ext = imageBlob.pathname.endsWith(".png") ? "png" : "jpg";
    const res = await fetch(imageBlob.url);
    const buffer = Buffer.from(await res.arrayBuffer());
    return { buffer, ext };
  }

  await ensureDir();
  for (const ext of ["jpg", "png"]) {
    try {
      const buffer = await fs.readFile(imagePath(id, ext));
      return { buffer, ext };
    } catch {
      continue;
    }
  }
  return null;
}

export async function deletePhoto(id: string): Promise<void> {
  if (BLOB_ENABLED) {
    const blobs = await blobsForId(id);
    if (blobs.length) await del(blobs.map((b) => b.url));
    return;
  }

  for (const ext of ["jpg", "png"]) {
    await fs.unlink(imagePath(id, ext)).catch(() => {});
  }
  await fs.unlink(metaPath(id)).catch(() => {});
}
