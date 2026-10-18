import { useMemo, useState } from "react";
import FanHand from "../../../shared/components/FanHand";
import {
  Badge,
  Button,
  Group,
  Loader,
  NumberInput,
  Stack,
  Text,
} from "@mantine/core";
import { AcquireGameState, AcquirePlayerState, Chain, Tile } from "../types";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import {
  activeChains,
  availableChains,
  canDeclare,
  CHAIN_COLOUR,
  currentPrice,
  describe,
  isPlayable,
  label,
  MAX_BUY,
  money,
  stockOf,
} from "../board";
import classes from "./ActionPanel.module.css";

function ChainButton({
  chain,
  onClick,
  children,
}: {
  chain: Chain;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      size="xs"
      onClick={onClick}
      style={{ background: CHAIN_COLOUR[chain], color: "#fff" }}
    >
      {children}
    </Button>
  );
}

/** Fixed strip: the hand while placing, chain choices, disposal and purchase controls. */
export default function ActionPanel({
  gameState,
  me,
  loading,
  onTile,
  onFound,
  onSurvivor,
  onDispose,
  onBuy,
  onDeclare,
}: {
  gameState: AcquireGameState;
  me: AcquirePlayerState;
  loading: boolean;
  onTile: (tile: Tile) => void;
  onFound: (chain: Chain) => void;
  onSurvivor: (chain: Chain) => void;
  onDispose: (sell: number, trade: number) => void;
  onBuy: (purchases: { [chain in Chain]?: number }) => void;
  onDeclare: () => void;
}) {
  const phase = gameState.phase;
  const acting = gameState.activePlayer === me.email;
  const who = displayName(gameState.activePlayer);
  const key = `${gameState.turn}:${phase}:${gameState.activePlayer}:${gameState.merger?.current}`;
  const [draft, setDraft] = useState<{
    key: string;
    sell: number;
    trade: number;
    buy: { [chain in Chain]?: number };
  }>({ key: "", sell: 0, trade: 0, buy: {} });
  const d = draft.key === key ? draft : { key, sell: 0, trade: 0, buy: {} };
  const set = (patch: Partial<typeof d>) => setDraft({ ...d, ...patch, key });

  const hand = me.tiles || [];
  const [stagedTile, setStagedTile] = useState<{
    key: string;
    tile: Tile | null;
  }>({ key: "", tile: null });
  const staged = stagedTile.key === key ? stagedTile.tile : null;
  const tileFan = (enabled: boolean) => (
    <FanHand
      ariaLabel="Your tiles"
      trayLabel="To play"
      minWidth={44}
      maxWidth={64}
      ratio={1.3}
      disabled={!enabled || loading}
      selected={staged ? [staged] : []}
      onToggle={(tile) =>
        setStagedTile({ key, tile: staged === tile ? null : (tile as Tile) })
      }
      items={hand.map((tile) => {
        const playable = isPlayable(gameState, tile);
        return {
          key: tile,
          label: `Tile ${tile}${playable ? "" : ", unplayable"}`,
          title: describe(gameState, tile),
          disabled: !playable,
          node: <TileFace tile={tile} playable={playable} />,
        };
      })}
    />
  );
  const declarable =
    acting &&
    (phase === "PLACE" || phase === "BUY") &&
    canDeclare(gameState) &&
    gameState.turnPlayer === me.email;
  const buyTotal = useMemo(
    () => Object.values(d.buy).reduce((s, n) => s + (n || 0), 0),
    [d.buy],
  );
  const buyCost = useMemo(
    () =>
      (Object.entries(d.buy) as [Chain, number][]).reduce(
        (s, [c, n]) => s + (n || 0) * currentPrice(gameState, c),
        0,
      ),
    [d.buy, gameState],
  );

  if (!acting) {
    const doing =
      phase === "DISPOSE"
        ? `is settling ${label(gameState.merger?.current as Chain)} shares`
        : phase === "FOUND"
          ? "is choosing a chain to found"
          : phase === "SURVIVOR"
            ? "is choosing the surviving chain"
            : phase === "BUY"
              ? "is buying shares"
              : "is playing a tile";
    return (
      <div
        className={`${classes.panel} ${classes.compact} safe-bottom`}
        data-testid="action-panel"
      >
        <Text size="sm" c="dimmed" ta="center">
          {loading ? (
            <>
              Sending your move
              <ThinkingDots />
            </>
          ) : (
            <>
              Waiting for {who}, who {doing}.
              {isBotName(gameState.activePlayer) && <ThinkingDots />}
            </>
          )}
        </Text>
        {hand.length > 0 && tileFan(false)}
      </div>
    );
  }

  let body: React.ReactNode;
  let hint: string;
  if (loading) {
    body = <Loader size="xs" color="yellow" />;
    hint = "Sending your move…";
  } else if (phase === "PLACE") {
    hint = staged
      ? `${describe(gameState, staged)}. Play it, or tap it to put it back.`
      : "Tap a tile to lift it, then play it. Dashed outlines on the board show where your tiles would go.";
    body = (
      <Stack gap={4} align="center">
        <Button
          size="sm"
          color="yellow"
          disabled={!staged}
          onClick={() => staged && onTile(staged)}
        >
          {staged ? `Play ${staged}` : "Pick a tile below"}
        </Button>
        {tileFan(true)}
      </Stack>
    );
  } else if (phase === "FOUND") {
    hint = "Choose the chain to found. You get its first share free.";
    body = (
      <Group gap={6} justify="center" wrap="wrap">
        {availableChains(gameState).map((chain) => (
          <ChainButton key={chain} chain={chain} onClick={() => onFound(chain)}>
            {label(chain)}
          </ChainButton>
        ))}
      </Group>
    );
  } else if (phase === "SURVIVOR") {
    hint = "The largest chains are tied. Choose which one survives.";
    body = (
      <Group gap={6} justify="center" wrap="wrap">
        {(gameState.merger?.candidates || []).map((chain) => (
          <ChainButton
            key={chain}
            chain={chain}
            onClick={() => onSurvivor(chain)}
          >
            {label(chain)} ({gameState.chains[chain].size})
          </ChainButton>
        ))}
      </Group>
    );
  } else if (
    phase === "DISPOSE" &&
    gameState.merger?.current &&
    gameState.merger.survivor
  ) {
    const defunct = gameState.merger.current;
    const survivor = gameState.merger.survivor;
    const held = stockOf(me, defunct);
    const price = gameState.merger.price ?? currentPrice(gameState, defunct);
    const keep = held - d.sell - d.trade;
    const valid =
      d.sell >= 0 &&
      d.trade >= 0 &&
      d.trade % 2 === 0 &&
      keep >= 0 &&
      d.trade / 2 <= gameState.chains[survivor].stockLeft;
    hint = `${label(defunct)} is absorbed by ${label(survivor)}. You hold ${held}: sell at ${money(price)} each, trade two for one ${label(survivor)} (${gameState.chains[survivor].stockLeft} left), or keep.`;
    body = (
      <Group gap="xs" justify="center" wrap="wrap" align="flex-end">
        <NumberInput
          size="xs"
          w={90}
          label="Sell"
          min={0}
          max={held}
          value={d.sell}
          onChange={(v) => set({ sell: Number(v) || 0 })}
          aria-label="Shares to sell"
        />
        <NumberInput
          size="xs"
          w={90}
          label="Trade"
          min={0}
          max={held}
          step={2}
          value={d.trade}
          onChange={(v) => set({ trade: Number(v) || 0 })}
          aria-label="Shares to trade"
        />
        <Text size="sm">Keep {Math.max(0, keep)}</Text>
        <Button disabled={!valid} onClick={() => onDispose(d.sell, d.trade)}>
          Settle {d.sell ? `+${money(d.sell * price)}` : ""}
        </Button>
      </Group>
    );
  } else {
    const chains = activeChains(gameState);
    const remaining = MAX_BUY - gameState.bought - buyTotal;
    hint = chains.length
      ? `Buy up to ${MAX_BUY - gameState.bought} shares, then end your turn. You have ${money(me.money)}.`
      : "No chains on the board yet. End your turn to draw a tile.";
    body = (
      <Group gap="xs" justify="center" wrap="wrap" align="center">
        {chains.map((chain) => {
          const n = d.buy[chain] || 0;
          const price = currentPrice(gameState, chain);
          const left = gameState.chains[chain].stockLeft - n;
          return (
            <Group key={chain} gap={2} wrap="nowrap">
              <Button
                size="xs"
                variant="default"
                disabled={n === 0}
                onClick={() => set({ buy: { ...d.buy, [chain]: n - 1 } })}
                aria-label={`One less ${label(chain)}`}
              >
                −
              </Button>
              <Badge
                size="lg"
                radius="sm"
                variant="filled"
                style={{ background: CHAIN_COLOUR[chain], color: "#fff" }}
              >
                {n} {label(chain)} {money(price)}
              </Badge>
              <Button
                size="xs"
                variant="default"
                disabled={
                  remaining <= 0 || left <= 0 || buyCost + price > me.money
                }
                onClick={() => set({ buy: { ...d.buy, [chain]: n + 1 } })}
                aria-label={`One more ${label(chain)}`}
              >
                +
              </Button>
            </Group>
          );
        })}
        <Button onClick={() => onBuy(d.buy)} disabled={buyCost > me.money}>
          {buyTotal ? `Buy for ${money(buyCost)} and end turn` : "End turn"}
        </Button>
      </Group>
    );
  }

  return (
    <div
      className={`${classes.panel} ${classes.active} safe-bottom`}
      data-testid="action-panel"
    >
      <Stack gap={6} align="center">
        <Group gap="sm" justify="center" wrap="wrap">
          <Badge color="yellow" variant="filled" radius="sm" size="lg">
            {gameState.turnPlayer === me.email ? "Your turn" : "Your decision"}
          </Badge>
          {gameState.declaredBy ? (
            <Badge color="red" variant="light" radius="sm" size="lg">
              Last turn: the end was called
            </Badge>
          ) : (
            declarable &&
            !loading && (
              <Button size="xs" color="red" variant="light" onClick={onDeclare}>
                Call the end of the game
              </Button>
            )
          )}
        </Group>
        {body}
        <Text size="sm" c="dimmed" ta="center">
          {hint}
        </Text>
      </Stack>
    </div>
  );
}

/** A tile from the bag: its coordinate on a cream card, greyed when it cannot be played. */
function TileFace({ tile, playable }: { tile: Tile; playable: boolean }) {
  return (
    <svg viewBox="0 0 44 56" width="100%" height="100%" aria-hidden="true">
      <rect
        x="1.5"
        y="1.5"
        width="41"
        height="53"
        rx="5"
        fill={playable ? "#f3e9d2" : "#b9b2a3"}
        stroke="#2a2a2a"
        strokeWidth="1.5"
      />
      <text
        x="22"
        y="35"
        textAnchor="middle"
        fontSize="18"
        fontWeight="800"
        fill="#1c1f24"
        fontFamily="Georgia, serif"
      >
        {tile}
      </text>
    </svg>
  );
}
