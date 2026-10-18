import { useCallback, useState } from "react";
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
import { ForSaleGameState, ForSalePlayerState } from "../types";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import PropertyCard from "./PropertyCard";
import { money, passCost } from "../money";
import classes from "./ActionPanel.module.css";

/** Fixed strip: bid and pass while buying, pick a property while selling. */
export default function ActionPanel({
  gameState,
  player,
  isActive,
  loading,
  onBid,
  onPass,
  onSell,
}: {
  gameState: ForSaleGameState;
  player: ForSalePlayerState;
  isActive: boolean;
  loading: boolean;
  onBid: (amount: number) => void;
  onPass: () => void;
  onSell: (property: number) => void;
}) {
  const buying = gameState.phase === "BUYING";
  const [custom, setCustom] = useState<number | string>("");
  const [picked, setPicked] = useState<{
    key: string;
    property: number | null;
  }>({ key: "", property: null });
  const roundKey = `${gameState.phase}:${gameState.round}`;
  const selected = picked.key === roundKey ? picked.property : null;
  const pick = useCallback(
    (property: number | null) => setPicked({ key: roundKey, property }),
    [roundKey],
  );

  const who = displayName(gameState.activePlayer);
  const highBid = gameState.highBid;
  const cheapest = gameState.onOffer?.[0];
  const cost = passCost(player.bid);
  const raises = [1, 2, 3]
    .map((r) => highBid + r)
    .filter((a) => a <= player.money);
  const customAmount = typeof custom === "number" ? custom : Number(custom);
  const customOk =
    Number.isInteger(customAmount) &&
    customAmount > highBid &&
    customAmount <= player.money;

  if (!buying) {
    const chosen = (gameState.chosen || []).includes(player.email);
    const hand = player.properties || [];
    return (
      <div
        className={`${classes.panel} ${chosen ? classes.compact : classes.active} safe-bottom`}
        data-testid="action-panel"
      >
        <Stack gap={6} align="center">
          {chosen || hand.length === 0 ? (
            <>
              <Text size="sm" c="dimmed" ta="center">
                {loading
                  ? "Sending your choice"
                  : "Chosen. Waiting for the others"}
                <ThinkingDots />
              </Text>
              {hand.length > 0 && (
                <FanHand
                  ariaLabel="Your properties"
                  disabled
                  selected={[]}
                  onToggle={() => {}}
                  minWidth={48}
                  maxWidth={72}
                  ratio={150 / 110}
                  items={hand.map((p) => ({
                    key: String(p),
                    label: `Property ${p}`,
                    node: <PropertyCard property={p} width={72} />,
                  }))}
                />
              )}
            </>
          ) : (
            <>
              <Group gap="sm" justify="center" wrap="wrap">
                <Badge color="yellow" variant="filled" radius="sm" size="lg">
                  Choose a property
                </Badge>
                {loading && <Loader size="xs" color="yellow" />}
                <Button
                  disabled={selected === null || loading}
                  onClick={() => selected !== null && onSell(selected)}
                >
                  {selected === null
                    ? "Pick a card below"
                    : `Sell #${selected}`}
                </Button>
              </Group>
              <FanHand
                ariaLabel="Your properties"
                trayLabel="To sell"
                disabled={loading}
                selected={selected === null ? [] : [String(selected)]}
                onToggle={(k) =>
                  pick(selected === Number(k) ? null : Number(k))
                }
                minWidth={54}
                maxWidth={84}
                ratio={150 / 110}
                items={hand.map((p) => ({
                  key: String(p),
                  label: `Property ${p}`,
                  node: <PropertyCard property={p} width={84} />,
                }))}
              />
              <Text size="xs" c="dimmed" ta="center">
                The highest property played takes the biggest cheque on offer.
              </Text>
            </>
          )}
        </Stack>
      </div>
    );
  }

  if (!isActive) {
    return (
      <div
        className={`${classes.panel} ${classes.compact} safe-bottom`}
        data-testid="action-panel"
      >
        <Text size="sm" c="dimmed" ta="center">
          {player.passed
            ? `You are out of this auction. Waiting for ${who}.`
            : `Waiting for ${who}. Your bid stands at ${money(player.bid)}.`}
          {isBotName(gameState.activePlayer) && <ThinkingDots />}
        </Text>
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
          {loading && <Loader size="xs" color="yellow" />}
          <Button
            variant="default"
            disabled={loading}
            onClick={onPass}
            color="gray"
          >
            Pass: take #{cheapest}
            {cost ? ` for ${money(cost)}` : " free"}
          </Button>
          {raises.map((amount) => (
            <Button
              key={amount}
              disabled={loading}
              onClick={() => onBid(amount)}
            >
              Bid {money(amount)}
            </Button>
          ))}
          <Group gap={4} wrap="nowrap">
            <NumberInput
              size="sm"
              w={110}
              min={highBid + 1}
              max={player.money}
              step={1}
              value={custom}
              onChange={setCustom}
              placeholder="thousands"
              aria-label="Custom bid in thousands"
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
        </Group>
        <Text size="sm" c="dimmed" ta="center">
          {highBid
            ? `Beat ${money(highBid)} or pass. Passing now costs ${money(cost)} and takes #${cheapest}.`
            : `Open the bidding, or pass to take #${cheapest} for free.`}{" "}
          You have {money(player.money)}.
        </Text>
      </Stack>
    </div>
  );
}
