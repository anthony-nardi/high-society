# High Society / No Thanks!

Two Reiner Knizia-style card games played online against friends or bots.

- `src/` — Vite + React 19 + Mantine 9 client (`/high-society`, `/no-thanks`)
- `functions/` — Firebase Cloud Functions holding all game logic (Node 22 runtime)
- Realtime Database stores lobbies and game state; Google sign-in via Firebase Auth

## Commands

```bash
yarn install                      # client
npm --prefix functions install    # functions

yarn dev                          # http://localhost:5173
yarn test                         # client tests (vitest + testing-library)
yarn typecheck && yarn lint
yarn build

npm --prefix functions test       # game rules: bidding, passing, No Thanks! turns, bot search
npm --prefix functions run lint
npm --prefix functions run build
```

## Bots

High Society bots pick their move with a Maxn search (multiplayer minimax
from [minimaxer](https://github.com/domw95/minimaxer)) over the current
auction only; the face-down deck is never read. Candidate moves are a few
raises plus pass, and finished auctions are scored by a heuristic in
`functions/src/high-society/helpers/botSearch.ts` (status cards, money kept,
and the risk of ending with the least money). No Thanks! bots use the simple
rule-based player in `functions/src/no-thanks/helpers/simpleBot.ts`.

## Local Firebase

When the client is served from `localhost` it connects to the emulators
(auth 9099, database 9000, functions 5001). Start them with the functions
built:

```bash
npm --prefix functions run build
firebase emulators:start --only auth,database,functions
```

Deploy with `firebase deploy` (hosting serves `dist/`, functions run their lint
and build as a predeploy step).
