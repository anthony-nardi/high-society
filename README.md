# High Society / No Thanks! / Razzia! / Family Inc. / For Sale / The Bridges of Shangri-La / Acquire / Condottiere / Ride the Rails / Clans / TwixT / Ecosystem / Fuji Flush / Tigris & Euphrates / Ecosystem: Coral Reef / Ecosystem: Savanna / Medici / PUSH / ZÈRTZ / YINSH / DVONN / GIPF / LYNGK

Twenty-four board and card games played online against friends or bots.

- `src/` — Vite + React 19 + Mantine 9 client (`/high-society`, `/no-thanks`, `/razzia`, `/family-inc`, `/zertz`, `/yinsh`, `/dvonn`, `/gipf`, `/lyngk`, `/for-sale`, `/shangri-la`, `/acquire`, `/condottiere`, `/ride-the-rails`, `/clans`, `/twixt`, `/ecosystem`, `/fuji-flush`, `/tigris`, `/coral-reef`, `/savanna`, `/medici`, `/push`)
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

## Adding a game

Every game is a `GameModule` (`functions/src/shared/game.ts`): a name, a
pure `createState`, a map of callable names to pure rule functions that
return `{ ok } | { ok: false, reason }`, `isGameOver`, and a pure `botTurn`.
Register it in `functions/src/shared/registry.ts` and describe it in
`functions/src/shared/gameInfo.ts`; the shared pipeline then supplies auth,
the active-player check, persistence, the bot loop with its pacing, the
lobby limits and rematches. The client imports the server's types directly
through the `@games/*` alias (see `tsconfig.app.json` and `vite.config.ts`),
so the two sides cannot drift, and calls moves through
`src/shared/callGameAction.ts`. Razzia! is the reference implementation.

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
- Razzia! (2020 Primigenio edition wording; `functions/src/razzia/helpers/botSearch.ts`): auctions are
  searched with Maxn driven by the pure rules in `helpers/rules.ts`; the
  action phase (reveal, call, thief) uses a heuristic on the same
  evaluation because every reveal hides a shuffled deck.

- Family Inc. (`functions/src/family-inc/helpers/botSearch.ts`): a
  push-your-luck turn against a face-down pile is a chance problem, so the
  bot runs expectimax over the pile's public composition: stop versus one
  more draw, with steals and the risk of being stolen from in the leaf.

- ZÈRTZ (`functions/src/zertz/helpers/botSearch.ts`): two players, no
  chance, so a time-limited negamax with alpha-beta pruning over whole
  turns (placement plus ring removal, or a full capture chain).

- YINSH (`functions/src/yinsh/helpers/botSearch.ts`): negamax with
  alpha-beta over ring moves; row and ring removals inside the search use a
  fixed policy so the tree stays one node per move.

- DVONN (`functions/src/dvonn/helpers/botSearch.ts`): a placement
  heuristic (DVONN pieces central and apart, own pieces hugging them), then
  negamax with alpha-beta over stack moves.

- GIPF (`functions/src/gipf/helpers/botSearch.ts`): the basic game;
  negamax with alpha-beta over the 42 ways to push a piece in, with a fixed
  policy for choosing between crossing rows.

- LYNGK (`functions/src/lyngk/helpers/botSearch.ts`): negamax with
  alpha-beta where a node is a whole turn (an optional colour claim plus a
  move, LYNGK links included).

- For Sale (`functions/src/for-sale/helpers/botSearch.ts`): Maxn over the
  current auction (pass or raise by one to three thousand) for buying; a
  rank-matching heuristic for the simultaneous selling rounds.

- The Bridges of Shangri-La (`functions/src/shangri-la/helpers/botSearch.ts`):
  a setup heuristic, then Maxn over whole turns (place, recruit, journey).

- Acquire follows the 2023 Renegade rulebook: Classic or Tycoon Mode is chosen in the lobby (two players are always Classic, with the stock market as a phantom shareholder), a starting tile per player, the end called on a turn finishes that turn, and a founder is paid cash when a chain's stock is gone.

- Acquire (`functions/src/acquire/helpers/botSearch.ts`): a one-ply planner
  that plays each candidate tile on a copy, follows its own policies for
  founding, survivors and disposals, weighs the worst merger a rival could
  spring next, and keeps the best standing. Shares are valued by the bonus
  ladder of the mode in play (so Tycoon's third place is chased), which
  drives buying, trading and the end call. `ARENA=1 npx vitest run arena`
  plays it against the previous bot.

- Condottiere (`functions/src/condottiere/helpers/botSearch.ts`): judgement
  rather than search, since hands are hidden: a region's worth, the state
  of the battle, and the cheapest card that changes it.

- Clans (`functions/src/clans/helpers/botSearch.ts`): judgement with one
  reply ahead, since clans are secret: a move by what its own clan gains,
  what the others gain, how well its huts sit afterwards, less the best
  village-founding reply against it.

- TwixT (`functions/src/twixt/helpers/botSearch.ts`): a two-ply search over
  the holes near the pegs, scored by how many pegs each side still needs
  to join its borders along knight's moves that honour the links and the
  crossings they forbid. Links are laid automatically when a peg goes down
  and can be removed by their owner.

- Ecosystem (`functions/src/ecosystem/helpers/botSearch.ts`): every card in
  hand in every open cell (and every swap for a Rabbit), scored by the
  grid's points, a diversity estimate, a guess at the stream and wolf
  placings and the room left to grow.

- Fuji Flush (`functions/src/fuji-flush/helpers/botSearch.ts`): a card is
  worth the chance it survives until it is pushed through, estimated from
  the unseen cards each opponent who plays first might hold, plus the
  tempo taken from everyone it flushes, less the help it lends the team
  it joins and a little for spending a high number.

- Tigris & Euphrates (`functions/src/tigris/helpers/botSearch.ts`): every
  legal action is tried on a copy, the conflicts it starts are fought out
  with plausible commitments, and the result is valued by the lowest
  sphere above all, leaders in place with supporters and monuments beside
  them, less what the strongest rival stands to gain.

- Ecosystem: Coral Reef (`functions/src/coral-reef/helpers/botSearch.ts`):
  the Ecosystem judgement over the reef's cards: points with the whales'
  flips chosen, the food web bonus, a guess at the plankton placing and
  the room left to grow; an Octopus tries every swap and every move.

- Ecosystem: Savanna (`functions/src/savanna/helpers/botSearch.ts`): the
  Ecosystem judgement with the rulebook's scoring order, cheetahs and
  lions flipping prey for the hyenas and vultures, a guess at the gazelle
  bonus and the room left to grow.

- Medici (`functions/src/medici/helpers/botSearch.ts`): a lot is worth
  what it changes in the day's payouts: the ship's expected place with the
  rest of the holds still to fill, the tracks' awards today and carried
  into the days to come, and the climb towards the bonus levels; a bid
  stays well under that, since florins are the score, and the auctioneer keeps turning over cards
  while the lot's worth to them, less the keenest rival's, should grow.

- PUSH (`functions/src/push/helpers/botSearch.ts`): the deck's contents
  are known, so one more card is valued exactly: the average over the
  deck of the best stop after it, a bust costing the zone's expected loss
  and handing every column to the others; the bot draws while that beats
  stopping, and protects a colour the die is likely to reach before the
  end.

- Ride the Rails (`functions/src/ride-the-rails/helpers/botSearch.ts`):
  a share by what the railroad will pay, each locomotive by the links and
  bonuses it earns on a copy of the map, and a journey by what it pays the
  rider less what it hands the other shareholders.

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
