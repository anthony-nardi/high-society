import { Badge, Button, Group, Stack, Text } from "@mantine/core";
import type { MediciGameState } from "../types";
import {
  biddingOrder,
  canBid,
  florins,
  freeSpace,
  lotLabel,
  MAX_LOT,
  maxFit,
  nameFor,
  shipValue,
} from "../board";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import CardFace from "./CardFace";
import classes from "../medici.module.css";

/** The middle of the table: the day, the lot on the block, the bids round the table, and the last sale. */
export default function Auction({
  gameState,
  me,
  onLedger,
}: {
  gameState: MediciGameState;
  me?: string | null;
  onLedger?: () => void;
}) {
  const name = (email: string) => nameFor(email, me);
  const lot = gameState.lot || [];
  const bidding = gameState.phase === "BID";
  const last = gameState.lastAuction;
  const fresh = last && last.turn === gameState.turn - 1 && !lot.length;
  const auctioneer = gameState.auctioneer;
  const limit = Math.min(MAX_LOT, maxFit(gameState));

  return (
    <Stack gap="sm" align="center" data-testid="auction">
      <Group gap="xs" justify="center" wrap="wrap">
        <Badge variant="light" radius="sm" size="lg">
          Day {gameState.day} of 3
        </Badge>
        <Badge variant="light" color="gray" radius="sm" size="lg">
          Deck {gameState.deckCount}
        </Badge>
        <Badge variant="light" color="gray" radius="sm" size="lg">
          Holds of {gameState.capacity}
        </Badge>
        {gameState.dayScoring && onLedger && (
          <Button
            size="compact-xs"
            variant="subtle"
            color="yellow"
            onClick={onLedger}
          >
            Day {gameState.dayScoring.day} ledger
          </Button>
        )}
      </Group>

      <div className={classes.block}>
        <Text size="sm" c="dimmed" ta="center">
          <b>{name(auctioneer)}</b> {auctioneer === me ? "hold" : "holds"} the
          first player card
          {bidding ? " and bids last." : "."}
        </Text>
        <div className={classes.lot} data-testid="lot">
          {lot.length ? (
            lot.map((card, i) => (
              <div
                key={`${gameState.turn}-${i}`}
                className="piece piece-drop"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <CardFace card={card} width={92} />
              </div>
            ))
          ) : fresh && last ? (
            <div className={classes.lotGhost} key={`gone-${last.turn}`}>
              {last.lot.map((card, i) => (
                <div
                  key={i}
                  className={last.email ? classes.sold : classes.discarded}
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <CardFace card={card} width={72} dimmed={!last.email} />
                </div>
              ))}
            </div>
          ) : (
            <Text size="sm" c="dimmed">
              The block is empty.
            </Text>
          )}
        </div>
        {lot.length > 0 && (
          <Text size="sm" ta="center" fw={600}>
            Lot of {lot.length}: {lotLabel(lot)} · value {shipValue(lot)}
            {!bidding &&
              (lot.length < limit
                ? ` · ${name(auctioneer)} may turn over ${limit - lot.length} more`
                : "")}
          </Text>
        )}
        {fresh && last && (
          <Text
            key={`last-${last.turn}`}
            size="sm"
            ta="center"
            className={classes.narrative}
            data-testid="last-auction"
            c={last.email ? undefined : "dimmed"}
          >
            {last.email ? (
              <>
                <b>{name(last.email)}</b> took {lotLabel(last.lot)} for{" "}
                <b>{florins(last.amount || 0)}</b>.
              </>
            ) : (
              <>Nobody bid: {lotLabel(last.lot)} discarded.</>
            )}
          </Text>
        )}
      </div>

      {bidding && (
        <Group
          gap={6}
          justify="center"
          wrap="wrap"
          aria-label="Bids in order"
          data-testid="bids"
        >
          {biddingOrder(gameState).map((p) => {
            const active = p.email === gameState.activePlayer;
            const high = p.email === gameState.highBidder;
            const label =
              p.bid !== undefined
                ? `${p.bid}`
                : p.passed
                  ? lot.length > freeSpace(gameState, p)
                    ? "no room"
                    : "pass"
                  : active
                    ? "bidding"
                    : canBid(gameState, p)
                      ? "…"
                      : "—";
            return (
              <Badge
                key={p.email}
                variant={high ? "filled" : active ? "light" : "outline"}
                color={high ? "yellow" : active ? "yellow" : "gray"}
                radius="sm"
                size="lg"
                className={high ? classes.highBid : undefined}
              >
                {displayName(p.email)}
                {p.email === auctioneer ? " ★" : ""}: {label}
                {active && isBotName(p.email) && <ThinkingDots />}
              </Badge>
            );
          })}
        </Group>
      )}
      {bidding && (
        <Text size="xs" c="dimmed" ta="center">
          {gameState.highBidder
            ? `${name(gameState.highBidder)} ${gameState.highBidder === me ? "hold" : "holds"} the high bid at ${florins(gameState.highBid || 0)}.`
            : "No bid yet: the first bid may be a single florin."}{" "}
          One bid each, round the table; ★ bids last.
        </Text>
      )}
    </Stack>
  );
}
