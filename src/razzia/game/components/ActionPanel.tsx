import { useCallback, useState } from "react";
import FanHand from "../../../shared/components/FanHand";
import { Badge, Button, Group, Stack, Text } from "@mantine/core";
import { LootCards, RazziaGameState, RazziaPlayerState } from "../types";
import revealCard from "../../client/revealCard";
import initiateAuction from "../../client/initiateAuction";
import activateThief from "../../client/useThief";
import bidOnLoot from "../../client/bidOnLoot";
import passOnLoot from "../../client/passOnLoot";
import { useLobbyContext } from "../../../shared/context/useLobbyContext";
import displayName from "../../../shared/utils/displayName";
import MoneyCard from "./MoneyCard";
import formatMoney from "../money";
import classes from "./ActionPanel.module.css";

function highestBid(gameState: RazziaGameState) {
  return Math.max(0, ...gameState.players.map((p) => Number(p.bid) || 0));
}

/**
 * Fixed strip along the bottom. In the action phase: reveal, call an
 * auction, or use a thief (pick cards on the table first). In an auction:
 * pick one of your Money tokens and bid, or pass.
 */
export default function ActionPanel({
  gameState,
  player,
  isActive,
  stealing,
  stealSelection,
  onStartStealing,
  onCancelStealing,
}: {
  gameState: RazziaGameState;
  player: RazziaPlayerState;
  isActive: boolean;
  stealing: boolean;
  stealSelection: LootCards[];
  onStartStealing: () => void;
  onCancelStealing: () => void;
}) {
  const { lobbyId } = useLobbyContext();
  const [loading, setLoading] = useState(false);
  const [chosenMoney, setChosenMoney] = useState<string | null>(null);

  const call = useCallback(async (fn: () => Promise<void>) => {
    setLoading(true);
    try {
      await fn();
    } finally {
      setLoading(false);
      setChosenMoney(null);
    }
  }, []);
  const lobbyUID = `${lobbyId}`;

  const auction =
    gameState.roundState === "NORMAL_AUCTION" ||
    gameState.roundState === "FORCED_AUCTION";
  const loot = (gameState.revealedCards || []).filter(
    (c) => c !== "POLICE_RAIDS",
  );
  const thieves = (player.cards?.theives || []).length;
  const floor = highestBid(gameState);
  const available = [...(player.availableMoney || [])].sort(
    (a, b) => Number(a) - Number(b),
  );
  const biddable = available.filter((m) => Number(m) > floor);
  const isCaller = player.email === gameState.auctionTriggeringPlayer;
  const mustBid =
    isCaller &&
    gameState.roundState === "NORMAL_AUCTION" &&
    floor === 0 &&
    biddable.length > 0;
  const canReveal = gameState.remainingCards > 0;
  const canCall = true;
  const canSteal = thieves > 0 && loot.length > 0;

  let hint: string;
  if (!isActive) {
    hint = `Waiting for ${displayName(gameState.activePlayer)}.`;
  } else if (stealing) {
    hint = `Pick up to ${thieves} card${thieves === 1 ? "" : "s"} on the table, then confirm.`;
  } else if (auction) {
    if (biddable.length === 0) {
      hint =
        floor > 0
          ? `Nothing in your hand beats ${formatMoney(floor)}. You have to pass.`
          : "You have no money left to bid.";
    } else if (mustBid) {
      hint = "You called this auction and nobody bid, so you must bid.";
    } else if (floor > 0) {
      hint = `Highest bid is ${formatMoney(floor)}. Pick a Money token above it, or pass.`;
    } else {
      hint = "No bids yet. Pick a Money token to bid, or pass.";
    }
    if (chosenMoney) {
      hint = `Bid ${formatMoney(chosenMoney)}: you would get the ${loot.length} loot card${
        loot.length === 1 ? "" : "s"
      } and the ${formatMoney(gameState.money)} Money token if nobody beats it.`;
    }
  } else if (!canReveal) {
    hint = "The deck is empty. Call an auction.";
  } else if (loot.length > 0) {
    hint = `Reveal another card, or call an auction for the ${loot.length} card${
      loot.length === 1 ? "" : "s"
    } on the table. ${gameState.raidLimit - gameState.policeRaids} more police raid${
      gameState.raidLimit - gameState.policeRaids === 1 ? "" : "s"
    } end the round; the seventh loot card auctions itself.`;
  } else {
    hint =
      "Reveal a card from the deck. You may also call an auction on an empty table to swap a Money token for the one on the board.";
  }

  // Off turn, the panel shrinks to one line so the table has the screen.
  if (!isActive && !stealing) {
    return (
      <div
        className={`${classes.panel} ${classes.compact} safe-bottom`}
        data-testid="action-panel"
      >
        <Text size="sm" c="dimmed" ta="center">
          Waiting for {displayName(gameState.activePlayer)}. You have{" "}
          {available.length} Money token{available.length === 1 ? "" : "s"}
          {thieves > 0
            ? ` and ${thieves} thief${thieves === 1 ? "" : "s"}`
            : ""}
          .
        </Text>
      </div>
    );
  }

  return (
    <div
      className={`${classes.panel} safe-bottom ${isActive ? classes.active : ""}`}
      data-testid="action-panel"
    >
      <Stack gap={6} align="center">
        {auction && isActive && biddable.length > 0 && !stealing && (
          <FanHand
            ariaLabel="Your Money tokens"
            trayLabel="Your bid"
            disabled={loading}
            selected={chosenMoney ? [chosenMoney] : []}
            onToggle={(amount) =>
              setChosenMoney((current) => (current === amount ? null : amount))
            }
            minWidth={56}
            maxWidth={84}
            ratio={84 / 120}
            items={available.map((amount) => ({
              key: amount,
              label: `Money token ${formatMoney(amount)}${Number(amount) <= floor ? " (too low)" : ""}`,
              disabled: Number(amount) <= floor,
              node: (
                <MoneyCard
                  amount={amount}
                  available={Number(amount) > floor}
                  width="100%"
                />
              ),
            }))}
          />
        )}

        <Group gap="sm" justify="center" wrap="wrap">
          {isActive && (
            <Badge color="yellow" variant="filled" radius="sm" size="lg">
              Your turn
            </Badge>
          )}

          {stealing ? (
            <>
              <Button
                disabled={loading || stealSelection.length === 0}
                loading={loading}
                onClick={async () => {
                  await call(() =>
                    activateThief({ lobbyUID, cardToSteal: stealSelection }),
                  );
                  // Leave pick mode whether or not the steal went through.
                  onCancelStealing();
                }}
              >
                Steal {stealSelection.length || ""}
              </Button>
              <Button
                variant="default"
                disabled={loading}
                onClick={onCancelStealing}
              >
                Cancel
              </Button>
            </>
          ) : auction ? (
            <>
              <Button
                disabled={!isActive || loading || !chosenMoney}
                loading={loading}
                onClick={() =>
                  chosenMoney &&
                  call(() => bidOnLoot({ lobbyUID, amount: chosenMoney }))
                }
              >
                {chosenMoney ? `Bid ${formatMoney(chosenMoney)}` : "Bid"}
              </Button>
              <Button
                variant="default"
                disabled={!isActive || loading || mustBid}
                loading={loading}
                onClick={() => call(() => passOnLoot({ lobbyUID }))}
                title={
                  mustBid ? "You must bid: you called the auction" : undefined
                }
              >
                Pass
              </Button>
            </>
          ) : (
            <>
              <Button
                disabled={!isActive || loading || !canReveal}
                loading={loading}
                onClick={() => call(() => revealCard({ lobbyUID }))}
              >
                Reveal a card
              </Button>
              <Button
                variant={canCall ? "filled" : "default"}
                color={canCall ? "yellow" : undefined}
                disabled={!isActive || loading || !canCall}
                loading={loading}
                onClick={() => call(() => initiateAuction({ lobbyUID }))}
              >
                Call an auction
              </Button>
              <Button
                variant="default"
                disabled={!isActive || loading || !canSteal}
                onClick={onStartStealing}
                title={thieves === 0 ? "You have no thief cards" : undefined}
              >
                Use a thief ({thieves})
              </Button>
            </>
          )}
        </Group>
        <Text size="sm" c="dimmed" ta="center">
          {hint}
        </Text>
      </Stack>
    </div>
  );
}
