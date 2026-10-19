import { useState } from "react";
import {
  Badge,
  Button,
  Group,
  Loader,
  NumberInput,
  Stack,
  Text,
} from "@mantine/core";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import type { MediciGameState, MediciPlayerState } from "../types";
import {
  canBid,
  florins,
  freeSpace,
  isFull,
  lotLabel,
  MAX_LOT,
  maxFit,
} from "../board";
import classes from "./ActionPanel.module.css";

/** Fixed strip: turn over or offer while making up a lot; pass or bid when it is on the block. */
export default function ActionPanel({
  gameState,
  player,
  isActive,
  loading,
  onDraw,
  onOffer,
  onBid,
  onPass,
}: {
  gameState: MediciGameState;
  player: MediciPlayerState;
  isActive: boolean;
  loading: boolean;
  onDraw: () => void;
  onOffer: () => void;
  onBid: (amount: number) => void;
  onPass: () => void;
}) {
  const [custom, setCustom] = useState<number | string>("");
  const who = displayName(gameState.activePlayer);
  const lot = gameState.lot || [];
  const bidding = gameState.phase === "BID";
  const full = isFull(gameState, player);
  const free = freeSpace(gameState, player);

  if (!isActive) {
    let note: string;
    if (full) note = "Your hold is full: you sit out the rest of the day.";
    else if (bidding && player.bid !== undefined)
      note = `Your bid of ${florins(player.bid)} stands. Waiting for ${who}`;
    else if (bidding && player.passed)
      note =
        lot.length > free
          ? `That lot would not fit your ${free} free slot${free === 1 ? "" : "s"}. Waiting for ${who}`
          : `You passed. Waiting for ${who}`;
    else if (bidding) note = `Waiting for ${who} to bid`;
    else note = `Waiting for ${who} to make up the lot`;
    return (
      <div
        className={`${classes.panel} ${classes.compact} safe-bottom`}
        data-testid="action-panel"
      >
        <Text size="sm" c="dimmed" ta="center">
          {note}
          {isBotName(gameState.activePlayer) && <ThinkingDots />}
        </Text>
      </div>
    );
  }

  if (!bidding) {
    const limit = Math.min(MAX_LOT, maxFit(gameState));
    const mayDraw = lot.length < limit && gameState.deckCount > 0;
    return (
      <div
        className={`${classes.panel} ${classes.active} safe-bottom`}
        data-testid="action-panel"
      >
        <Stack gap={6} align="center">
          <Group gap="sm" justify="center" wrap="wrap">
            <Badge color="yellow" variant="filled" radius="sm" size="lg">
              Your lot
            </Badge>
            {loading && <Loader size="xs" color="yellow" />}
            <Button disabled={!mayDraw || loading} onClick={onDraw}>
              {lot.length ? "Turn over another" : "Turn over a card"}
            </Button>
            <Button
              variant={lot.length ? "filled" : "default"}
              color={lot.length ? "green" : "gray"}
              disabled={!lot.length || loading}
              onClick={onOffer}
            >
              {lot.length ? `Offer the lot of ${lot.length}` : "Offer the lot"}
            </Button>
          </Group>
          <Text size="xs" c="dimmed" ta="center" data-testid="hint">
            {lot.length === 0
              ? "You must turn over at least one card. Up to three make a lot, no more than the roomiest hold can take."
              : lot.length < limit
                ? `${lotLabel(lot)} so far. Turn over up to ${limit - lot.length} more, or offer it now. You bid last.`
                : `${lotLabel(lot)}: no hold could take more. Offer it; you bid last.`}
            {lot.length > free && lot.length > 0
              ? ` It will not fit your ${free} free slot${free === 1 ? "" : "s"}.`
              : ""}
          </Text>
        </Stack>
      </div>
    );
  }

  const highBid = gameState.highBid || 0;
  const may = canBid(gameState, player);
  const quick = [1, 2, 5, 10]
    .map((r) => highBid + r)
    .filter((a, i, all) => a <= player.money && all.indexOf(a) === i);
  const customAmount = typeof custom === "number" ? custom : Number(custom);
  const customOk =
    Number.isInteger(customAmount) &&
    customAmount > highBid &&
    customAmount <= player.money;
  const last = player.email === gameState.auctioneer;

  return (
    <div
      className={`${classes.panel} ${classes.active} safe-bottom`}
      data-testid="action-panel"
    >
      <Stack gap={6} align="center">
        <Group gap="sm" justify="center" wrap="wrap">
          <Badge color="yellow" variant="filled" radius="sm" size="lg">
            Your bid
          </Badge>
          {loading && <Loader size="xs" color="yellow" />}
          <Button
            variant="default"
            color="gray"
            disabled={loading}
            onClick={onPass}
          >
            Pass
          </Button>
          {may &&
            quick.map((amount) => (
              <Button
                key={amount}
                disabled={loading}
                onClick={() => onBid(amount)}
              >
                Bid {amount}
              </Button>
            ))}
          {may && (
            <Group gap={4} wrap="nowrap">
              <NumberInput
                size="sm"
                w={100}
                min={highBid + 1}
                max={player.money}
                step={1}
                value={custom}
                onChange={setCustom}
                placeholder="florins"
                aria-label="Custom bid in florins"
                disabled={loading}
              />
              <Button
                variant="light"
                disabled={!customOk || loading}
                onClick={() => onBid(customAmount)}
              >
                Bid
              </Button>
            </Group>
          )}
        </Group>
        <Text size="xs" c="dimmed" ta="center" data-testid="hint">
          {!may
            ? "You cannot bid on this lot."
            : highBid
              ? `Beat ${florins(highBid)} or pass.`
              : "Open the bidding with at least 1 florin, or pass."}{" "}
          {last
            ? "You bid last: one florin more than the high bid takes it."
            : "You get one bid; the auctioneer answers last."}{" "}
          You have {florins(player.money)}, and florins are points.
        </Text>
      </Stack>
    </div>
  );
}
