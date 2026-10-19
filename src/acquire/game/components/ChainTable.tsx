import { Badge, Table, Text } from "@mantine/core";
import { AcquireGameState, AcquirePlayerState, Chain } from "../types";
import displayName from "../../../shared/utils/displayName";
import {
  bonusLevels,
  CHAIN_COLOUR,
  CHAINS,
  currentPrice,
  holders,
  isActive,
  isSafe,
  label,
  money,
  stockOf,
} from "../board";

/**
 * Every chain: size, price, who leads it, shares left and what you hold.
 * Pointing at a row lights the chain up on the board; tapping it keeps
 * it lit.
 */
export default function ChainTable({
  gameState,
  me,
  focused,
  onFocus,
}: {
  gameState: AcquireGameState;
  me: AcquirePlayerState | null;
  /** The chain lit on the board, if any. */
  focused?: Chain | null;
  /** Called with a chain to light it, null to let go, "pin" to keep it. */
  onFocus?: (chain: Chain | null, pin?: boolean) => void;
}) {
  const places = gameState.mode === "TYCOON" ? 3 : 2;
  const name = (email: string) =>
    email === me?.email ? "you" : displayName(email);
  return (
    <Table.ScrollContainer minWidth={560}>
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
            <Table.Th>
              Holders
              <Text component="span" size="xs" c="dimmed" display="block">
                most shares first
              </Text>
            </Table.Th>
            <Table.Th ta="right">Left</Table.Th>
            {me && <Table.Th ta="right">Yours</Table.Th>}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {CHAINS.map((chain) => {
            const active = isActive(gameState, chain);
            const top = holders(gameState, chain).slice(0, places);
            const lit = focused === chain;
            return (
              <Table.Tr
                key={chain}
                style={{
                  opacity: active ? 1 : 0.55,
                  cursor: active ? "pointer" : undefined,
                  outline: lit ? `2px solid ${CHAIN_COLOUR[chain]}` : undefined,
                  outlineOffset: -2,
                }}
                onMouseEnter={active ? () => onFocus?.(chain) : undefined}
                onMouseLeave={active ? () => onFocus?.(null) : undefined}
                onClick={active ? () => onFocus?.(chain, true) : undefined}
                data-testid={`chain-${chain.toLowerCase()}`}
              >
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
                <Table.Td fz="xs" style={{ whiteSpace: "nowrap" }}>
                  {active && top.length
                    ? top.map((h, i) => (
                        <Text
                          component="span"
                          key={h.email}
                          size="xs"
                          fw={i === 0 ? 700 : 400}
                          c={i === 0 ? undefined : "dimmed"}
                        >
                          {i > 0 && " · "}
                          {i === 0 && "👑 "}
                          {name(h.email)} {h.shares}
                        </Text>
                      ))
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
    </Table.ScrollContainer>
  );
}
