# Find the Royals (KQJ)

A room-based multiplayer card game for 2–4 friends. One player creates a room and shares a short
code; the others join. Players take turns flipping one of 25 face-down cards. Hidden among them are
the **King (500)**, **Queen (300)** and **Jack (100)** of one secret suit — and a secret **Ace
(1000)** that wins the game the instant it is flipped.

Built as a standalone **Next.js (App Router)** app, designed to deploy on **Vercel** with no separate
server. Shared game state lives in **Upstash Redis** (REST API). Because it is turn-based, clients
**poll** the state every ~1.5s instead of using WebSockets.

---

## Rules

- 25 cards are laid out face down in a 5×5 grid.
- Hidden inside: exactly one **K**, **Q** and **J** of one randomly chosen suit, plus exactly one
  **Ace** (the surprise jackpot). The other 21 are non-scoring filler cards (ranks 2–10).
- On your turn you flip **one** card. It stays face up for everyone to see.
- **Scoring** goes to whoever flipped it: King = 500, Queen = 300, Jack = 100.
- **The Ace** is worth **1000** and **instantly wins** the game. Nobody is told it exists until it
  is flipped — then there is a big gold explosion and confetti.
- If the Ace is never flipped, the round ends the moment the **King, Queen and Jack are all found**.
  Highest total score wins (so the King is the big prize, the Ace is the jackpot).
- **Ties** are handled as co-winners. If a player leaves, they keep their claimed score and the game
  continues; if everyone leaves mid-game it ends on current scores.

## Anti-cheat / where the logic lives

All game logic is **server-side** (`lib/game.js` + the API routes):

- The deck is built and shuffled on the server (`buildCards`), keyed by a per-room seed.
- `get-state` only ever returns face-**up** cards' identities. A face-down card is sent as
  `{ index, faceUp: false }` — the client literally never knows what any hidden card is, so the Ace
  cannot be found by inspecting network traffic.
- `flip-card` validates server-side that it is that player's turn (via a private per-player token),
  that the game is in progress, and that the card is still face down, then applies scoring + win
  logic. A client cannot flip out of turn, flip someone else's turn, or fake a score.
- Each mutating request runs under a short per-room Redis lock so two near-simultaneous actions
  can't clobber the shared state.

---

## Run locally

```bash
npm install
```

Create a free Upstash Redis database (see below), then create a file named **`.env.local`** in the
project root with your two values (see `env.sample.txt`):

```
UPSTASH_REDIS_REST_URL=https://your-db-name.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-rest-token-here
```

Then:

```bash
npm run dev
```

Open http://localhost:3000. To test multiplayer locally, open the room in a second browser or an
incognito window and join with the code.

Production build check:

```bash
npm run build
```

---

## Deploy to Vercel (exact steps)

### 1. Create a free Upstash Redis database

1. Go to **https://console.upstash.com/** and sign up / log in (free).
2. Click **Create Database** → give it a name → choose a region near your players → **Create**.
3. Open the database, scroll to the **REST API** panel, and copy these two values:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### 2. The two environment variables

| Name | Value |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` | the REST URL from Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | the REST token from Upstash |

These are the only secrets. They live only in env vars — never in the code or git.

### 3. Push to GitHub and import into Vercel

1. Create a new GitHub repo and push this folder to it:
   ```bash
   git init
   git add .
   git commit -m "Find the Royals (KQJ) card game"
   git branch -M main
   git remote add origin https://github.com/<you>/kqj-game.git
   git push -u origin main
   ```
2. Go to **https://vercel.com/** → **Add New… → Project** → **Import** your `kqj-game` repo.
3. Framework preset is auto-detected as **Next.js**. Leave the defaults.
4. Open **Environment Variables** and add the two from step 2
   (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`).
5. Click **Deploy**.

That's it. Open the deployed URL, create a room, and share the code with friends. If you add the env
vars **after** the first deploy, trigger a redeploy so they take effect.

---

## Tech

- Next.js 15 (App Router) · React 19 · Framer Motion 11 · canvas-confetti · @upstash/redis (REST).
- No database schema to manage: each room is a single JSON value in Redis (`kqj:room:<CODE>`) with a
  6-hour TTL, so finished/abandoned rooms clean themselves up.

## Project layout

```
app/
  layout.js                 root layout + metadata
  globals.css               the whole premium casino theme
  page.js                   home: create / join a room
  room/[code]/page.js       the room: lobby, board, winner (polls get-state)
  components/
    Lobby.jsx               room code, player list, start button
    Board.jsx               turn banner, royal tracker, the 5x5 grid
    PlayingCard.jsx         one 3D-flip card (+ flying points)
    Scoreboard.jsx          live scores + event feed
    WinnerOverlay.jsx       winner screen + confetti / Ace jackpot burst
  api/
    create-room/route.js    make a room, become host
    join-room/route.js      join a lobby (max 4)
    start-game/route.js     host deals the 25 cards
    flip-card/route.js      flip one card (turn + scoring + win logic)
    get-state/route.js      read-only poll (hides face-down cards)
    rematch/route.js        reset a finished room to the lobby
    leave-room/route.js     leave / disconnect handling
lib/
  game.js                   pure game logic (deck, shuffle, scoring, winners, public view)
  store.js                  Redis load/save + per-room lock
  redis.js                  lazy Upstash client (no env needed at build time)
  http.js                   tiny response/id helpers
  client.js                 browser: API calls, credential storage, card display helpers
```
