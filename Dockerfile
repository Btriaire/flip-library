# Flip-Library — image de production pour le VPS.
#
# Déployée ici (plutôt que Vercel) parce que le fallback X (lib/twitter.ts)
# a besoin du binaire `curl` : le fetch natif de Node est bloqué au niveau
# de l'empreinte TLS par le CDN de syndication X, curl passe — et Vercel
# n'a pas de shell/curl accessible en serverless.
#
#   docker compose up -d --build

# ---- build stage : compile le bundle standalone ----
FROM node:20-slim AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY . .
RUN npm run build

# ---- runtime stage : serveur minimal ----
FROM node:20-slim AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# curl : requis par le fallback X/syndication (lib/twitter.ts) — le fetch
# natif de Node reçoit systématiquement un 429 de ce CDN précis.
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl ca-certificates \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app
# le bundle standalone contient server.js + le strict nécessaire de node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
