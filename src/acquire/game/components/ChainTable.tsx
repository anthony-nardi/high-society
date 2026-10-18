import { Badge, Table, Text } from "@mantine/core";
import { AcquireGameState, AcquirePlayerState } from "../types";
import {
  bonusLevels,
  CHAIN_COLOUR,
  CHAINS,
  currentPrice,
  isActive,
  isSafe,
  label,
  money,
  stockOf,
} from "../board";

/** Every chain: size, price, shares left and what you hold. */
export default function ChainTable({
  gameState,
  me,
}: {
  gameState: AcquireGameState;
  me: AcquirePlayerState | null;
}) {
  return (
    <Table
      withTableBorder
      striped
      highlightOnHover={false}
      verticalSpacing={4}
      horizontalSpacing="xs"
      fz="sm"
    >
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Chain</Table.Th>
          <Table.Th ta="right">Size</Table.Th>
          <Table.Th ta="right">Price</Table.Th>
          <Table.Th ta="right">
            Bonuses
            <Text component="span" size="xs" c="dimmed" display="block">
              1st · 2nd{gameState.mode === "TYCOON" ? " · 3rd" : ""}
            </Text>
          </Table.Th>
          <Table.Th ta="right">Left</Table.Th>
          {me && <Table.Th ta="right">Yours</Table.Th>}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {CHAINS.map((chain) => {
          const active = isActive(gameState, chain);
          return (
            <Table.Tr key={chain} style={{ opacity: active ? 1 : 0.55 }}>
              <Table.Td>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 3,
                      background: CHAIN_COLOUR[chain],
                      border: "1px solid rgba(0,0,0,0.5)",
                    }}
                  />
                  <Text size="sm">{label(chain)}</Text>
                  {isSafe(gameState, chain) && (
                    <Badge size="xs" color="gray" variant="light">
                      safe
                    </Badge>
                  )}
                </span>
              </Table.Td>
              <Table.Td ta="right">
                {active ? gameState.chains[chain].size : "–"}
              </Table.Td>
              <Table.Td ta="right">
                {active ? money(currentPrice(gameState, chain)) : "–"}
              </Table.Td>
              <Table.Td ta="right" fz="xs" style={{ whiteSpace: "nowrap" }}>
                {active
                  ? (() => {
                      const b = bonusLevels(
                        currentPrice(gameState, chain),
                        gameState.mode,
                      );
                      return [b.primary, b.secondary, b.tertiary]
                        .filter((n): n is number => n !== undefined)
                        .map(
                          (n) =>
                            (n / 1000).toFixed(1).replace(/\.0$/, "") + "k",
                        )
                        .join(" · ");
                    })()
                  : "–"}
              </Table.Td>
              <Table.Td ta="right">
                {gameState.chains[chain].stockLeft}
              </Table.Td>
              {me && (
                <Table.Td ta="right">{stockOf(me, chain) || "–"}</Table.Td>
              )}
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
