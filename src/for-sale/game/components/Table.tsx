import { Badge, Group, Stack, Text } from "@mantine/core";
import { ForSaleGameState } from "../types";
import PropertyCard from "./PropertyCard";
import ChequeCard from "./ChequeCard";
import displayName from "../../../shared/utils/displayName";
import { money } from "../money";

/** The middle of the table: what is on offer, the standing bid, and the last sale. */
export default function Table({ gameState }: { gameState: ForSaleGameState }) {
  const buying = gameState.phase === "BUYING";
  const offer = buying ? gameState.onOffer || [] : gameState.cheques || [];
  const key = `${gameState.phase}:${gameState.round}`;

  return (
    <Stack gap="sm" align="center">
      <Group gap="xs" justify="center">
        <Badge variant="light" radius="sm" size="lg">
          {buying ? "Buying" : "Selling"} · round {gameState.round}
        </Badge>
        <Badge variant="light" color="gray" radius="sm" size="lg">
          {buying
            ? `${gameState.propertiesLeft} properties left`
            : `${gameState.chequesLeft} cheques left`}
        </Badge>
      </Group>

      <Group gap="sm" justify="center" wrap="wrap" data-testid="on-offer">
        {buying
          ? (offer as number[]).map((property, i) => (
              <div
                key={`${key}-${property}`}
                className="piece piece-drop"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <PropertyCard property={property} width={96} />
              </div>
            ))
          : (offer as number[]).map((cheque, i) => (
              <div
                key={`${key}-${i}`}
                className="piece piece-drop"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <ChequeCard amount={cheque} width={96} />
              </div>
            ))}
      </Group>

      {buying ? (
        <Text size="sm" ta="center" c="dimmed">
          {gameState.highBidder
            ? `${displayName(gameState.highBidder)} holds the high bid at ${money(gameState.highBid)}. Passing takes the cheapest property left.`
            : "No bids yet. Bid, or pass to take the cheapest property for free."}
        </Text>
      ) : (
        <Text size="sm" ta="center" c="dimmed">
          Everyone picks a property face down. Highest property takes the
          biggest cheque.
          {gameState.chosen?.length
            ? ` ${gameState.chosen.length} of ${gameState.players.length} have chosen.`
            : ""}
        </Text>
      )}

      {!buying && gameState.lastSale && gameState.lastSale.length > 0 && (
        <Stack gap={4} align="center" data-testid="last-sale">
          <Text size="xs" c="dimmed">
            Last round
          </Text>
          <Group gap="md" justify="center" wrap="wrap">
            {gameState.lastSale.map((s) => (
              <Group key={s.email} gap={4} wrap="nowrap" align="center">
                <PropertyCard property={s.property} width={34} />
                <Text size="xs">
                  {displayName(s.email)} <b>{money(s.cheque)}</b>
                </Text>
              </Group>
            ))}
          </Group>
        </Stack>
      )}
    </Stack>
  );
}
