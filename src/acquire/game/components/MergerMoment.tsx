import { useState } from "react";
import { Badge, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { AcquireGameState, AcquirePlayerState, Chain } from "../types";
import displayName from "../../../shared/utils/displayName";
import {
  bonuses,
  bonusRank,
  CHAIN_COLOUR,
  currentPrice,
  label,
  money,
  stockOf,
} from "../board";

function ChainChip({ chain, big = false }: { chain: Chain; big?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: big ? "6px 12px" : "2px 8px",
        borderRadius: 8,
        background: CHAIN_COLOUR[chain],
        color: "#fff",
        fontWeight: 800,
        fontSize: big ? 18 : 13,
        border: "1px solid rgba(0,0,0,0.5)",
        whiteSpace: "nowrap",
      }}
    >
      {label(chain)}
    </span>
  );
}

/**
 * The merger, told in order: who swallows whom, what it pays out, and what
 * it means for you and the table. Shown while a chain is being settled
 * and while a tied survivor is being chosen; each absorbed chain plays
 * its own sequence.
 */
export default function MergerMoment({
  gameState,
  me,
}: {
  gameState: AcquireGameState;
  me: AcquirePlayerState | null;
}) {
  const merger = gameState.merger;
  const phase = gameState.phase;
  const [dismissed, setDismissed] = useState<string | null>(null);
  if (!merger) return null;
  const key = `${merger.tile}:${merger.current ?? "?"}:${merger.survivor ?? "?"}:${phase}`;
  if (dismissed === key) return null;

  const mover = gameState.players.find((p) => p.email === gameState.turnPlayer);
  const who = mover ? displayName(mover.email) : "Someone";

  // A tie for the largest chain: the mergemaker picks the survivor.
  if (phase === "SURVIVOR" && merger.candidates) {
    return (
      <Paper
        withBorder
        radius="md"
        p="sm"
        className="merger-card"
        style={{ maxWidth: 560, width: "100%" }}
      >
        <Stack gap={6} align="center">
          <Badge color="orange" variant="filled" radius="sm" size="lg">
            Merger at {merger.tile}
          </Badge>
          <Group gap={8} justify="center" wrap="wrap">
            {merger.candidates.map((c) => (
              <ChainChip key={c} chain={c} big />
            ))}
          </Group>
          <Text size="sm" ta="center">
            {who} played {merger.tile} and these chains are the same size, so{" "}
            {mover?.email === me?.email ? "you choose" : `${who} chooses`} which
            one survives. The others pay out and are swallowed.
          </Text>
        </Stack>
      </Paper>
    );
  }

  if (phase !== "DISPOSE" || !merger.current || !merger.survivor) return null;
  const defunct = merger.current;
  const survivor = merger.survivor;
  const price = merger.price ?? currentPrice(gameState, defunct);
  const survivorPrice = currentPrice(gameState, survivor);
  // As recorded when the bonuses were paid: holders settle one by one, so
  // the shares on the table now are not what the payout was based on.
  const paid: [string, number][] = merger.paid
    ? merger.paid.map((p) => [p.email, p.amount])
    : bonuses(gameState, defunct);
  const holders = (
    merger.holders ||
    gameState.players
      .map((p) => ({ email: p.email, shares: stockOf(p, defunct) }))
      .filter((h) => h.shares > 0)
  ).sort((a, b) => b.shares - a.shares);
  const held = me ? stockOf(me, defunct) : 0;
  const mine = me
    ? (holders.find((h) => h.email === me.email)?.shares ?? held)
    : 0;
  const myBonus = me ? (paid.find(([e]) => e === me.email)?.[1] ?? 0) : 0;
  const defunctSize = gameState.chains[defunct].size;
  const survivorSize = gameState.chains[survivor].size;
  const settling = gameState.activePlayer;
  const queue = merger.queue || [];
  const later = (merger.defunct || []).filter((c) => c !== defunct);

  return (
    <Paper
      key={key}
      withBorder
      radius="md"
      p="sm"
      className="merger-card"
      style={{ maxWidth: 560, width: "100%" }}
      aria-live="polite"
    >
      <Stack gap={8} align="center">
        <Badge color="orange" variant="filled" radius="sm" size="lg">
          Merger at {merger.tile}
        </Badge>

        {/* 1. The takeover: the survivor pulls the defunct chain in. */}
        <Group
          gap={10}
          justify="center"
          wrap="nowrap"
          className="merger-step merger-step-1"
        >
          <ChainChip chain={survivor} big />
          <span className="merger-arrow" aria-hidden="true">
            ◀
          </span>
          <span className="merger-swallowed">
            <ChainChip chain={defunct} big />
          </span>
        </Group>
        <Text size="sm" ta="center" className="merger-step merger-step-1">
          <b>{label(survivor)}</b> ({survivorSize} tiles, {money(survivorPrice)}{" "}
          a share) swallows <b>{label(defunct)}</b> ({defunctSize} tiles,{" "}
          {money(price)} a share).
          {later.length
            ? ` ${later.map(label).join(" and ")} will follow.`
            : ""}
        </Text>

        {/* 2. The payout, one holder at a time. */}
        <Stack
          gap={2}
          align="center"
          className="merger-step merger-step-2"
          style={{ width: "100%" }}
        >
          <Text
            size="xs"
            c="dimmed"
            tt="uppercase"
            style={{ letterSpacing: 1 }}
          >
            {label(defunct)} bonuses
          </Text>
          {paid.length === 0 ? (
            <Text size="sm" c="dimmed">
              Nobody held {label(defunct)}: no bonuses.
            </Text>
          ) : (
            paid.map(([email, amount], i) => (
              <Group
                key={email}
                gap={8}
                justify="space-between"
                wrap="nowrap"
                className="merger-row"
                style={{
                  width: "100%",
                  maxWidth: 360,
                  animationDelay: `${900 + i * 220}ms`,
                }}
              >
                <Text
                  size="sm"
                  fw={email === me?.email ? 800 : 500}
                  truncate
                  style={{ minWidth: 0 }}
                >
                  {email === me?.email ? "You" : displayName(email)}
                  <Text component="span" size="xs" c="dimmed">
                    {" "}
                    · {holders.find((h) => h.email === email)?.shares ?? 0}{" "}
                    shares · {bonusRank(amount, price, gameState.mode)}
                  </Text>
                </Text>
                <Text
                  size="sm"
                  fw={800}
                  c="green.4"
                  style={{ whiteSpace: "nowrap" }}
                >
                  +{money(amount)}
                </Text>
              </Group>
            ))
          )}
        </Stack>

        {/* 3. What it means for you and the table. */}
        <Text size="sm" ta="center" className="merger-step merger-step-3">
          {me ? (
            mine > 0 ? (
              <>
                You held <b>{mine}</b> {label(defunct)}
                {myBonus ? (
                  <>
                    {" "}
                    and took <b>{money(myBonus)}</b> in bonuses
                  </>
                ) : (
                  " and took no bonus"
                )}
                .{held !== mine ? ` You still hold ${held}.` : ""} Each share
                sells for <b>{money(price)}</b>, or two trade for one{" "}
                {label(survivor)} worth <b>{money(survivorPrice)}</b>.
              </>
            ) : (
              <>
                You hold no {label(defunct)}, so nothing to settle.
                {stockOf(me, survivor)
                  ? ` Your ${stockOf(me, survivor)} ${label(survivor)} grow in value as the chain grows.`
                  : ""}
              </>
            )
          ) : null}
        </Text>
        {holders.length > 0 && (
          <Group
            gap={6}
            justify="center"
            wrap="wrap"
            className="merger-step merger-step-3"
            aria-label="Who holds the swallowed chain"
          >
            {holders.map((h) => (
              <Badge
                key={h.email}
                size="sm"
                radius="sm"
                variant={h.email === me?.email ? "filled" : "light"}
                color={h.email === me?.email ? "yellow" : "gray"}
              >
                {h.email === me?.email ? "You" : displayName(h.email)}{" "}
                {h.shares}
              </Badge>
            ))}
          </Group>
        )}
        {(merger.settled || []).length > 0 && (
          <Stack
            gap={2}
            align="center"
            style={{ width: "100%" }}
            aria-label="Settled so far"
          >
            {(merger.settled || []).map((st, i) => (
              <Text
                key={`${st.email}-${i}`}
                size="xs"
                className="merger-row"
                style={{ animationDelay: "0ms" }}
                fw={st.email === me?.email ? 800 : 500}
              >
                {st.email === me?.email ? "You" : displayName(st.email)}{" "}
                {[
                  st.sell ? `sold ${st.sell} for ${money(st.cash)}` : "",
                  st.trade
                    ? `traded ${st.trade} for ${st.trade / 2} ${label(survivor)}`
                    : "",
                  st.keep ? `kept ${st.keep}` : "",
                ]
                  .filter(Boolean)
                  .join(", ")}
                .
              </Text>
            ))}
          </Stack>
        )}
        <Group
          gap={8}
          justify="center"
          wrap="wrap"
          className="merger-step merger-step-3"
        >
          <Text size="xs" c="dimmed">
            Settling now:{" "}
            {settling === me?.email ? "you" : displayName(settling)}
            {queue.length > 1
              ? `, then ${queue
                  .slice(1)
                  .map((e) => (e === me?.email ? "you" : displayName(e)))
                  .join(", ")}`
              : ""}
            .
          </Text>
          <Button
            size="compact-xs"
            variant="subtle"
            onClick={() => setDismissed(key)}
          >
            Hide
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
