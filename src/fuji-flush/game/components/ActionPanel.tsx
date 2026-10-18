import { useState } from "react";
import { Badge, Button, Group, Loader, Stack, Text } from "@mantine/core";
import FanHand from "../../../shared/components/FanHand";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import { FujiFlushGameState, FujiFlushPlayerState } from "../types";
import { preview } from "../board";
import CardFace from "./CardFace";
import classes from "./ActionPanel.module.css";

/** Fixed strip: the hand fanned along the bottom, one card lifted to play. */
export default function ActionPanel({
  gameState,
  player,
  isActive,
  loading,
  onPlay,
}: {
  gameState: FujiFlushGameState;
  player: FujiFlushPlayerState;
  isActive: boolean;
  loading: boolean;
  onPlay: (card: number) => void;
}) {
  const [picked, setPicked] = useState<{ turn: number; key: string | null }>({
    turn: -1,
    key: null,
  });
  const selectedKey = picked.turn === gameState.turn ? picked.key : null;
  const hand = player.hand || [];
  const items = hand.map((card, i) => ({
    key: `${card}-${i}`,
    label: `Card ${card}`,
    node: <CardFace card={card} width={84} decorative />,
  }));
  const selectedCard =
    selectedKey === null ? null : Number(selectedKey.split("-")[0]);
  const who = displayName(gameState.activePlayer);
  const pushedForMe =
    gameState.lastPush && gameState.lastPush.members.includes(player.email)
      ? gameState.lastPush
      : null;

  if (!isActive) {
    return (
      <div
        className={`${classes.panel} ${hand.length ? classes.active : classes.compact} safe-bottom`}
        data-testid="action-panel"
      >
        <Stack gap={6} align="center">
          <Text size="sm" c="dimmed" ta="center">
            {player.played !== undefined
              ? `Your ${player.played} is on the table. `
              : ""}
            Waiting for {who}
            {isBotName(gameState.activePlayer) && <ThinkingDots />}
          </Text>
          {hand.length > 0 && (
            <FanHand
              ariaLabel="Your hand"
              disabled
              selected={[]}
              onToggle={() => {}}
              minWidth={48}
              maxWidth={72}
              ratio={150 / 110}
              items={items}
            />
          )}
        </Stack>
      </div>
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
            Your turn
          </Badge>
          {pushedForMe && (
            <Badge color="green" variant="light" radius="sm" size="lg">
              Your {pushedForMe.card} went through
            </Badge>
          )}
          {loading && <Loader size="xs" color="yellow" />}
          <Button
            disabled={selectedCard === null || loading}
            onClick={() => selectedCard !== null && onPlay(selectedCard)}
          >
            {selectedCard === null
              ? "Pick a card below"
              : `Play ${selectedCard}`}
          </Button>
        </Group>
        <FanHand
          ariaLabel="Your hand"
          trayLabel="To play"
          disabled={loading}
          selected={selectedKey === null ? [] : [selectedKey]}
          onToggle={(key) =>
            setPicked({
              turn: gameState.turn,
              key: selectedKey === key ? null : key,
            })
          }
          minWidth={54}
          maxWidth={84}
          ratio={150 / 110}
          items={items}
        />
        <Text size="xs" c="dimmed" ta="center" data-testid="preview">
          {selectedCard === null
            ? "Higher numbers flush lower ones; an equal number joins forces."
            : preview(gameState, player.email, selectedCard)}
        </Text>
      </Stack>
    </div>
  );
}
