import { useEffect, useRef, useState } from "react";
import { Badge, Box, Group, Text } from "@mantine/core";
import { AcquireGameState, AcquirePlayerState, Chain } from "../types";
import { useUserContext } from "../../../shared/context/useUserContext";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import {
  bonusRank,
  CHAIN_COLOUR,
  CHAINS,
  label,
  money,
  stockOf,
} from "../board";

/** A bonus arriving as a cheque: payee, amount, and the rank stamped on it. */
function Cheque({
  to,
  amount,
  rank,
  chain,
}: {
  to: string;
  amount: number;
  rank: string;
  chain: Chain;
}) {
  return (
    <div
      className="cheque"
      role="status"
      aria-label={`Cheque to ${to}: ${money(amount)}, ${rank}`}
    >
      <div
        className="cheque-strip"
        style={{ background: CHAIN_COLOUR[chain] }}
      />
      <div className="cheque-body">
        <div className="cheque-to">
          Pay to <b>{to}</b>
        </div>
        <div className="cheque-amount">{money(amount)}</div>
        <div className="cheque-memo">{label(chain)} stockholder bonus</div>
      </div>
      <div className="cheque-stamp">{rank}</div>
    </div>
  );
}

/** A share, drawn plainly enough to read at thumbnail size: the chain's colour and its initial on cream. */
function Share({ chain, width = 34 }: { chain: Chain; width?: number }) {
  const height = Math.round(width * 1.35);
  return (
    <svg
      viewBox="0 0 34 46"
      width={width}
      height={height}
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <rect
        x="1"
        y="1"
        width="32"
        height="44"
        rx="4"
        fill="#f3e9d2"
        stroke="#1d2230"
        strokeWidth="2"
      />
      <rect
        x="3"
        y="3"
        width="28"
        height="22"
        rx="3"
        fill={CHAIN_COLOUR[chain]}
      />
      <text
        x="17"
        y="20"
        textAnchor="middle"
        fontSize="16"
        fontWeight="900"
        fill="#fff"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="0.8"
        paintOrder="stroke"
      >
        {label(chain).charAt(0)}
      </text>
      <rect x="7" y="31" width="20" height="2.5" rx="1" fill="#8a7d64" />
      <rect x="9" y="37" width="16" height="2.5" rx="1" fill="#8a7d64" />
    </svg>
  );
}

export default function PlayerOverview({
  player,
  gameState,
}: {
  player: AcquirePlayerState;
  gameState: AcquireGameState;
}) {
  const { user } = useUserContext();
  const isActivePlayer = player.email === gameState.activePlayer;
  const isTurnPlayer = player.email === gameState.turnPlayer;
  const isCurrentUser = !!user && player.email === user.email;
  const isBot = isBotName(player.email);
  const held = CHAINS.filter((c) => stockOf(player, c) > 0);

  // Shares that just grew pop, and money that just arrived floats up.
  const lastStocks = useRef<{ [chain in Chain]?: number }>({});
  const lastMoney = useRef(player.money);
  const [grown, setGrown] = useState<{ key: number; chains: Chain[] }>({
    key: 0,
    chains: [],
  });
  const [gain, setGain] = useState<{
    amount: number;
    key: number;
    cheque?: { rank: string; chain: Chain };
  } | null>(null);
  useEffect(() => {
    const before = lastStocks.current;
    const chains = CHAINS.filter((c) => stockOf(player, c) > (before[c] ?? 0));
    lastStocks.current = Object.fromEntries(
      CHAINS.map((c) => [c, stockOf(player, c)]),
    );
    const delta = player.money - lastMoney.current;
    lastMoney.current = player.money;
    const timers: number[] = [];
    if (chains.length && Object.keys(before).length) {
      setGrown({ key: Date.now(), chains });
      timers.push(
        window.setTimeout(() => setGrown({ key: 0, chains: [] }), 1000),
      );
    }
    if (delta > 0) {
      // A bonus arrives as a cheque; other money floats up as a number.
      const merger = gameState.merger;
      const paid = merger?.paid?.find(
        (p) => p.email === player.email && p.amount === delta,
      );
      const cheque =
        paid && merger?.current && merger.price
          ? {
              rank: bonusRank(paid.amount, merger.price, gameState.mode),
              chain: merger.current,
            }
          : undefined;
      setGain({ amount: delta, key: Date.now(), cheque });
      timers.push(window.setTimeout(() => setGain(null), cheque ? 3400 : 1700));
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player]);

  return (
    <Box
      p="sm"
      data-testid="player-overview"
      style={{
        position: "relative",
        borderRadius: 12,
        border: isActivePlayer
          ? "2px solid var(--mantine-color-yellow-5)"
          : "2px solid transparent",
        boxShadow: isActivePlayer
          ? "0 0 14px rgba(255, 216, 107, 0.45)"
          : undefined,
        background: isActivePlayer
          ? "rgba(255, 216, 107, 0.06)"
          : "var(--mantine-color-default)",
        transition: "border-color 200ms, box-shadow 200ms",
        minWidth: 0,
        width: "100%",
        maxWidth: "100%",
      }}
    >
      {isActivePlayer && (
        <Badge
          color="yellow"
          variant="filled"
          radius="sm"
          style={{ position: "absolute", top: -10, left: 12 }}
        >
          {isCurrentUser ? (
            isTurnPlayer ? (
              "Your turn"
            ) : (
              "Your decision"
            )
          ) : isBot ? (
            <>
              Thinking
              <ThinkingDots />
            </>
          ) : isTurnPlayer ? (
            "Their turn"
          ) : (
            "Deciding"
          )}
        </Badge>
      )}
      {gain && !gain.cheque && (
        <span key={gain.key} className="money-float" aria-hidden="true">
          +{money(gain.amount)}
        </span>
      )}
      {gain && gain.cheque && (
        <Cheque
          key={gain.key}
          to={displayName(player.email)}
          amount={gain.amount}
          rank={gain.cheque.rank}
          chain={gain.cheque.chain}
        />
      )}
      <Text fw={700} truncate mt={4}>
        {displayName(player.email)}
        {isCurrentUser && (
          <Text component="span" c="dimmed" fw={400}>
            {" "}
            (you)
          </Text>
        )}
      </Text>
      {isCurrentUser ? (
        <Text
          fw={800}
          c="yellow.4"
          aria-label={`${money(player.money)} in cash`}
        >
          {money(player.money)} cash
        </Text>
      ) : (
        <Text size="xs" c="dimmed">
          {(player.tiles || []).length} tiles in hand
        </Text>
      )}
      <Group
        gap={4}
        mt={6}
        wrap="wrap"
        aria-label={`${displayName(player.email)}'s shares`}
      >
        {held.length === 0 ? (
          <Text size="xs" c="dimmed">
            No shares
          </Text>
        ) : (
          held.map((c) => {
            const n = stockOf(player, c);
            const shown = Math.min(n, 5);
            return (
              <div
                key={grown.chains.includes(c) ? `${c}-${grown.key}` : c}
                className={grown.chains.includes(c) ? "chip-pop" : undefined}
                role="img"
                aria-label={`${n} ${label(c)}`}
                title={`${n} ${label(c)} share${n === 1 ? "" : "s"}`}
                style={{
                  position: "relative",
                  width: 34 + (shown - 1) * 7,
                  height: 46,
                  marginRight: 8,
                  borderRadius: 4,
                }}
              >
                {Array.from({ length: shown }, (_, i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: i * 7,
                      top: 0,
                      filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))",
                    }}
                  >
                    <Share chain={c} />
                  </div>
                ))}
                <span
                  style={{
                    position: "absolute",
                    right: -8,
                    bottom: -5,
                    minWidth: 20,
                    padding: "0 6px",
                    borderRadius: 10,
                    background: "#1d2230",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 800,
                    textAlign: "center",
                    border: `2px solid ${CHAIN_COLOUR[c]}`,
                    lineHeight: "18px",
                  }}
                >
                  {n}
                </span>
              </div>
            );
          })
        )}
      </Group>
    </Box>
  );
}
