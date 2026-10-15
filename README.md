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

npm --prefix functions test       # game rules: bidding, passing, No Thanks! turns, bots
npm --prefix functions run lint
npm --prefix functions run build
```

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
