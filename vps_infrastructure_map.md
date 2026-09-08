# VPS infrastructure map — 46.202.131.240

Snapshot taken 2026-09-06 via live SSH inspection (docker ps, pm2 list,
nginx site configs, ss -tlnp). Re-verify before relying on a port/domain
being free or a service being up - this drifts as apps are added.

- Host: Hostinger VPS, Ubuntu 24.04, 15 GB RAM, 193 GB disk (77 GB used).
- SSH: ssh -i ~/.ssh/id_palama_vps root@46.202.131.240 - only root works with this key.
- Deploy pattern: clone into /opt/<app>, Docker Compose bound to 127.0.0.1:<port>, an Nginx site in /etc/nginx/sites-available/<app> (symlinked into sites-enabled/), TLS via certbot --nginx -d <app>.46.202.131.240.nip.io. A few older apps (palama-*, jarvis-api, constellation-media) run under PM2 instead of Docker.
- Private repo on this VPS: add a read-only GitHub deploy key rather than installing gh or a global token - gh repo deploy-key add <pubkey-file> --repo <owner>/<repo> from your local machine, using the VPS's existing ~/.ssh/id_ed25519.pub.

## Apps - domain to port to runtime

| Domain (*.46.202.131.240.nip.io) | Port (127.0.0.1) | Runtime | Notes |
|---|---|---|---|
| 46.202.131.240.nip.io (root) | 3000, 3001 | PM2 (palama-frontend, palama-proxy) | also proxies /api/ask to 9999 (Jarvis) |
| genea | 3700 | Docker (palama-genea) | plus palama-genea-db (Postgres 16), palama-genea-minio, own containers |
| flip | 3500 | Docker (flip-library) | this repo |
| dj | 3100 | Docker (djsynth) | |
| td3 | 3200 | Docker (td3-sr) | |
| phoscyon2 | 3300 | Docker (phoscyon2) | |
| synth-rack | 3400 | Docker (synth-rack) | |
| tr707 | 3600 | Docker (tr707) | |
| constellation-media | 3010 | PM2 | |
| fit2be-sync | 3800 | Docker (fit2be-sync-fit2be-sync) | |
| fit2be-motivation | 3801 | Docker (fit2be-motivation-fit2be-motivation) | |
| game | 8000 (backend) and 8501 (Streamlit) | Docker (world-game-{frontend,backend}-1) | plus own world-game-redis-1 |

No nginx site (no public domain) - internal/background only:
- Jarvis API: PM2 jarvis-api, port 9999, POST /api/ask {question, project} returns {answer} (Qwen2.5:3b via Ollama). Consumed by flip-library (lib/jarvis.ts).
- book-reader-backend: Docker, publicly bound 0.0.0.0:3002 (no TLS/nginx in front - reachable directly by IP:port).
- personal-library stack: personal-library-api (backend, currently flapping - see Known issues), personal-library-nginx, personal-library-db (Postgres, publicly bound 0.0.0.0:5432 - dedicated to this app, not shared), personal-library-cache (Redis, publicly bound 0.0.0.0:6379).
- aspi (unclecode/crawl4ai): Docker, publicly bound 0.0.0.0:11235.
- flaresolverr: Docker, 127.0.0.1:8191.
- ollama: bare process, *:11434 (all interfaces).
- vps-manager: PM2, port 9000 (also the PM2 daemon's own port - check for a clash if this ever misbehaves).
- social-planificator-queue-worker: PM2, background worker, no port.

## Ports in use (quick lookup)

3000/3001/3003 (PM2 palama-*), 3002 (book-reader, public), 3010 (constellation-media), 3100 (djsynth), 3200 (td3-sr), 3300 (phoscyon2), 3400 (synth-rack), 3500 (flip-library), 3600 (tr707), 3700 (palama-genea), 3800/3801 (fit2be-*), 5432 (Postgres - two different containers: personal-library-db public, palama-genea-db internal-only), 6379 (Redis, public, personal-library-cache), 8000/8501 (world-game), 8191 (flaresolverr), 9000 (PM2 daemon and vps-manager), 9999 (Jarvis API), 11235 (crawl4ai/aspi), 11434 (ollama).

Always re-check with docker ps plus pm2 list plus ss -tlnp before picking a new port - this list moves.

## Known issues (as of this snapshot)

- personal-library-api container is in a restart loop (Restarting (1)) - not investigated as part of this snapshot, flag if that app is touched.
- book-reader-backend, personal-library-db, personal-library-cache, and aspi are bound to 0.0.0.0 (publicly reachable by IP:port, not just localhost) rather than 127.0.0.1 like the rest of the fleet - worth tightening at some point, not urgent enough to have blocked anything yet.

## When to use this file

Reach for this map before: choosing a new port for an app deployed to this VPS, adding a new nginx site or subdomain, debugging "is X already running / already listening", or estimating free capacity (RAM/disk) before a new deploy. Treat the tables as a starting point - always re-verify live state for anything you're about to act on, since services get added or removed between sessions.
