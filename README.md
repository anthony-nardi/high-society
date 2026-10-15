# High Society / No Thanks! / Razzia!

Three Reiner Knizia-style card games played online against friends or bots.

- `src/` — Vite + React 19 + Mantine 9 client (`/high-society`, `/no-thanks`, `/razzia`)
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

npm --prefix functions test       # game rules and bot search for all three games
npm --prefix functions run lint
npm --prefix functions run build
```

## Bots

Bots in both games pick their move with a Maxn search (multiplayer minimax
from [minimaxer](https://github.com/domw95/minimaxer)) over the current
card only; the face-down deck is never read.

- High Society (`functions/src/high-society/helpers/botSearch.ts`): a few
  raises plus pass, scored by status cards, money kept and the risk of
  ending with the least money.
- No Thanks! (`functions/src/no-thanks/helpers/botSearch.ts`): take or
  chip, scored by the official rule plus a bonus for runs that can still
  grow.
- Razzia! (`functions/src/razzia/helpers/botSearch.ts`): auctions are
  searched with Maxn driven by the pure rules in `helpers/rules.ts`; the
  action phase (reveal, call, thief) uses a heuristic on the same
  evaluation because every reveal hides a shuffled deck.

Every bid, pass, chip and take is logged server-side and published with the
final state, so the game over screen shows the whole game.

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
