# Sources de flux

## Configuration requise

### Twitter/X (hashtags)
Pour activer la recherche de tweets par hashtag, définis la variable d'environnement :
```
TWITTER_BEARER_TOKEN=your_bearer_token_here
```

**Comment obtenir un token:**
1. Va sur https://developer.twitter.com/
2. Crée une application → Authentification OAuth 2.0
3. Génère un Bearer Token avec les permissions `tweet.read`
4. Copie-le dans `.env.local`

Endpoint: `/api/twitter/search?tag=mot_cle`

---

## Sources intégrées

### Perso, Pro, Other
- **Articles**: Feeds d'actualités générales
- **Vidéos**: 
  - 🎬 **YouTube Shorts** (< 10 min) — via `videoDuration: short` de l'API YouTube
  - **Twitch** — clips et VODs
- **🐦 Twitter/X** — tweets publics par hashtag (si TWITTER_BEARER_TOKEN est défini)

### Presse (onglet dédié)
- **NEWPI** — Digests AI reformulés par thématique, générés 2x/jour côté VPS
- Articles croisés de sources françaises (BFMTV, Basta!, The Conversation, etc.)

---

## Hashtags par environnement

**Perso:**
- `musique`
- `voyage`
- `cinéma`

**Pro:**
- `intelligence artificielle`
- `développement web`

**Other:**
- `actualités`
- `sciences`

Ajoute d'autres hashtags dans `lib/types.ts` → `DEFAULT_ENVIRONMENTS`
