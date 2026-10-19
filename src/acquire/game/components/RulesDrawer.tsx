import {
  Group,
  List,
  SegmentedControl,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useState } from "react";
import RulesDrawer from "../../../shared/components/RulesDrawer";
import { useGameStateContext } from "../../../shared/context/GameStateProvider";
import {
  bonusLevels,
  CHAIN_COLOUR,
  CHAINS,
  label,
  modeLabel,
  money,
  priceOf,
  TIER,
} from "../board";
import { Mode } from "../types";

const PRICES = [200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200];

const SIZES: [string, number][] = [
  ["2", 2],
  ["3", 3],
  ["4", 4],
  ["5", 5],
  ["6 to 10", 6],
  ["11 to 20", 11],
  ["21 to 30", 21],
  ["31 to 40", 31],
  ["41 and up", 41],
];

const LONE = "#9aa0ad";
const EMPTY = "rgba(255,255,255,0.08)";

type Cell = { fill: string; mark?: string; outline?: boolean };

/** A tiny strip of board squares with the played tile outlined in gold. */
function Strip({ cells, caption }: { cells: Cell[]; caption: string }) {
  const size = 22;
  const gap = 3;
  const width = cells.length * (size + gap);
  return (
    <Stack gap={2} align="center" style={{ minWidth: 0 }}>
      <svg
        viewBox={`0 0 ${width} ${size + 4}`}
        width={width}
        height={size + 4}
        role="img"
        aria-label={caption}
      >
        {cells.map((cell, i) => (
          <g key={i}>
            <rect
              x={i * (size + gap) + 1}
              y="2"
              width={size}
              height={size}
              rx="4"
              fill={cell.fill}
              stroke={cell.outline ? "#ffd86b" : "rgba(0,0,0,0.5)"}
              strokeWidth={cell.outline ? 2.5 : 1}
              strokeDasharray={cell.outline ? "3 2" : undefined}
            />
            {cell.mark && (
              <text
                x={i * (size + gap) + 1 + size / 2}
                y={2 + size / 2 + 4}
                textAnchor="middle"
                fontSize="11"
                fontWeight="800"
                fill="#fff"
              >
                {cell.mark}
              </text>
            )}
          </g>
        ))}
      </svg>
      <Text size="xs" c="dimmed" ta="center">
        {caption}
      </Text>
    </Stack>
  );
}

function Swatch({ chain }: { chain: keyof typeof CHAIN_COLOUR }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 11,
        height: 11,
        borderRadius: 3,
        background: CHAIN_COLOUR[chain],
        verticalAlign: "middle",
        marginRight: 4,
      }}
    />
  );
}

export default function AcquireRules() {
  const { gameState } = useGameStateContext("acquire");
  const [picked, setPicked] = useState<Mode>("TYCOON");
  const mode: Mode = gameState?.mode ?? picked;
  const T = CHAIN_COLOUR.TOWER;
  const L = CHAIN_COLOUR.LUXOR;
  return (
    <RulesDrawer title="How to play Acquire">
      <Stack gap="md">
        <Text>
          You are an investor. Tiles build hotel chains on the board, you buy
          shares in them, and when one chain swallows another, its biggest
          shareholders are paid. Whoever has the most money at the end wins.
        </Text>

        <Title order={4}>Your turn, in three steps</Title>
        <List type="ordered">
          <List.Item>
            <b>Play one tile</b> from your hand of six onto its square. What it
            does depends on its neighbours (see below).
          </List.Item>
          <List.Item>
            <b>Buy up to three shares</b>, in any mix, of chains that are on the
            board, at today's price.
          </List.Item>
          <List.Item>
            <b>Draw</b> a new tile so you hold six again.
          </List.Item>
        </List>

        <Title order={4}>What a tile does</Title>
        <Group gap="lg" justify="center" wrap="wrap">
          <Strip
            cells={[
              { fill: EMPTY },
              { fill: EMPTY, outline: true },
              { fill: EMPTY },
            ]}
            caption="No neighbours: it just sits there"
          />
          <Strip
            cells={[
              { fill: LONE },
              { fill: EMPTY, outline: true },
              { fill: EMPTY },
            ]}
            caption="Next to a lone tile: founds a chain, you get one free share"
          />
          <Strip
            cells={[
              { fill: T, mark: "T" },
              { fill: T, mark: "T" },
              { fill: EMPTY, outline: true },
            ]}
            caption="Next to one chain: the chain grows"
          />
          <Strip
            cells={[
              { fill: T, mark: "T" },
              { fill: T, mark: "T" },
              { fill: EMPTY, outline: true },
              { fill: L, mark: "L" },
            ]}
            caption="Between two chains: a merger"
          />
        </Group>
        <Text size="sm" c="dimmed">
          The table marks each tile in your hand with what it would do, and the
          dashed outlines on the board show where your tiles would go.
        </Text>

        <Title order={4}>The chains and their prices</Title>
        <Text size="sm">
          Seven chains in three price bands. A share costs more as the chain
          grows and more in a dearer band.
        </Text>
        <Group gap="sm" wrap="wrap">
          {CHAINS.map((c) => (
            <Text key={c} size="xs">
              <Swatch chain={c} />
              {label(c)}{" "}
              <Text component="span" c="dimmed">
                ({["cheap", "medium", "dear"][TIER[c]]})
              </Text>
            </Text>
          ))}
        </Group>
        <Table withTableBorder fz="xs" verticalSpacing={2}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Cheap</Table.Th>
              <Table.Th>Medium</Table.Th>
              <Table.Th>Dear</Table.Th>
              <Table.Th ta="right">Share price</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {PRICES.map((price) => (
              <Table.Tr key={price}>
                {(["LUXOR", "AMERICAN", "IMPERIAL"] as const).map((chain) => (
                  <Table.Td key={chain}>
                    {SIZES.find(
                      ([, size]) => priceOf(chain, size) === price,
                    )?.[0] ?? "–"}
                  </Table.Td>
                ))}
                <Table.Td ta="right">{money(price)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        <Text size="xs" c="dimmed">
          Each column is a band's chain sizes, as on the price card in the box:
          a medium chain pays one row more than a cheap one of the same size, a
          dear chain two rows more. Any chain can grow to any size.
        </Text>

        <Title order={4}>Who gets paid: {modeLabel(mode)} Mode</Title>
        {gameState ? (
          <Text size="sm">
            This game is in {modeLabel(mode)} Mode, chosen when the lobby was
            made.{" "}
            {mode === "TYCOON"
              ? "The top three stockholders of a swallowed chain are paid."
              : "The top two stockholders of a swallowed chain are paid."}
          </Text>
        ) : (
          <SegmentedControl
            size="xs"
            value={picked}
            onChange={(v) => setPicked(v as Mode)}
            data={[
              { value: "TYCOON", label: "Tycoon: top three" },
              { value: "CLASSIC", label: "Classic: top two" },
            ]}
            aria-label="Stockholder bonus mode"
          />
        )}
        <Table withTableBorder fz="xs" verticalSpacing={2}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Share price</Table.Th>
              <Table.Th ta="right">Primary</Table.Th>
              <Table.Th ta="right">Secondary</Table.Th>
              {mode === "TYCOON" && <Table.Th ta="right">Tertiary</Table.Th>}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {PRICES.map((price) => {
              const b = bonusLevels(price, mode);
              return (
                <Table.Tr key={price}>
                  <Table.Td>{money(price)}</Table.Td>
                  <Table.Td ta="right">{money(b.primary)}</Table.Td>
                  <Table.Td ta="right">{money(b.secondary)}</Table.Td>
                  {mode === "TYCOON" && (
                    <Table.Td ta="right">{money(b.tertiary ?? 0)}</Table.Td>
                  )}
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
        <List size="sm">
          {mode === "TYCOON" ? (
            <>
              <List.Item>
                A sole stockholder takes the primary and the tertiary.
              </List.Item>
              <List.Item>
                Tied for primary: the tied players split primary plus secondary,
                and the next holder takes the tertiary.
              </List.Item>
              <List.Item>
                Tied for secondary: the tied players split secondary plus
                tertiary, and nobody gets the tertiary.
              </List.Item>
              <List.Item>
                Tied for tertiary: the tied players split the tertiary.
              </List.Item>
              <List.Item>
                Only two stockholders: the tertiary is not paid.
              </List.Item>
            </>
          ) : (
            <>
              <List.Item>
                A sole stockholder takes the primary and the secondary.
              </List.Item>
              <List.Item>
                Tied for primary: the tied players split primary plus secondary,
                and nobody else is paid.
              </List.Item>
              <List.Item>
                Tied for secondary: the tied players split the secondary.
              </List.Item>
            </>
          )}
          <List.Item>Splits round up to the nearest hundred.</List.Item>
          <List.Item>
            <b>Two players:</b> the stock market joins every payout as a third
            holder with a random stake, the number on a tile drawn from the bag.
            Its bonus stays in the bank. Two-player games are always Classic.
          </List.Item>
        </List>

        <Title order={4}>Mergers, step by step</Title>
        <List type="ordered">
          <List.Item>
            <b>The bigger chain survives.</b> If the biggest are the same size,
            the player who played the tile picks the survivor.
          </List.Item>
          <List.Item>
            <b>The swallowed chain pays bonuses</b> at the price it had before
            the merger, to its top two or three stockholders as the table above
            shows. The merging tile does not count towards its size.
          </List.Item>
          <List.Item>
            <b>Every holder settles their shares</b>, starting with the player
            who caused the merger and going round the table. For each share you
            may <b>sell</b> it at the price it had just before the merger,
            <b> trade</b> two of them for one share of the survivor, or{" "}
            <b>keep</b> it for the day the chain is founded again.
          </List.Item>
          <List.Item>
            <b>The tiles join the survivor</b>, which is now bigger and dearer.
            The swallowed chain can be founded again later.
          </List.Item>
        </List>
        <Text size="sm" c="dimmed">
          Example from the rulebook: Imperial has five tiles, so a share is
          $700. Liz holds three, Charlie two. Imperial is swallowed: Liz gets
          the $7,000 primary, Charlie the $5,000 secondary (Tycoon) or $3,500
          (Classic), and both can then sell at $700 each.
        </Text>

        <Title order={4}>Safe chains and stuck tiles</Title>
        <List>
          <List.Item>
            A chain with <b>eleven or more tiles is safe</b>: it can never be
            swallowed. It still grows, and it can swallow others.
          </List.Item>
          <List.Item>
            A tile that would merge <b>two safe chains</b> can never be played.
            It is swapped for a new one when you draw.
          </List.Item>
          <List.Item>
            A tile that would found an <b>eighth chain</b> waits in your hand
            until a merger frees a chain.
          </List.Item>
          <List.Item>
            If none of your tiles can be played, you skip straight to buying.
          </List.Item>
        </List>

        <Title order={4}>Ending and scoring</Title>
        <List>
          <List.Item>
            On your turn you may <b>call the end</b> once any chain has 41
            tiles, or every chain on the board is safe. Nobody has to call it.
            You finish your turn as normal, then the game ends.
          </List.Item>
          <List.Item>
            Then every chain on the board pays its bonuses as if it were
            swallowed, and all shares are sold at today's prices. Shares in a
            chain not on the board are worth nothing.
          </List.Item>
          <List.Item>Most cash wins.</List.Item>
        </List>

        <Title order={4}>Good to know</Title>
        <List>
          <List.Item>
            <b>Setup:</b> each player draws one tile onto the board. Whoever
            drew the tile nearest 1A plays first (9A is nearer than 1B). Those
            tiles stay independent until a later tile joins them.
          </List.Item>
          <List.Item>
            Founding a chain whose 25 shares are all held pays the founder cash
            equal to a share instead.
          </List.Item>
          <List.Item>
            Everyone can see who holds which shares. Only your cash and your
            tiles are private.
          </List.Item>
          <List.Item>
            Each chain has 25 shares. When the bank runs out, nobody can buy
            more until some are sold or traded back.
          </List.Item>
          <List.Item>
            Shares in a swallowed chain that you keep are worth nothing until
            that chain is founded again.
          </List.Item>
        </List>
      </Stack>
    </RulesDrawer>
  );
}
