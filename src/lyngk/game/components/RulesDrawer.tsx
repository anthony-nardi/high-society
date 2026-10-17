import { Group, List, Stack, Text, Title } from "@mantine/core";
import RulesDrawer from "../../../shared/components/RulesDrawer";
import { FILL, STROKE } from "../pieces";
import { PieceIcon } from "./PlayerOverview";

const WOOD = "#5c3d22";
const LINE = "rgba(28, 16, 6, 0.75)";

function Disc({
  x,
  y,
  fill,
  stroke,
  n,
  glow,
}: {
  x: number;
  y: number;
  fill: string;
  stroke: string;
  n?: number;
  glow?: string;
}) {
  return (
    <g>
      <circle cx={x + 1.5} cy={y + 2} r="12" fill="#000" opacity="0.4" />
      <circle
        cx={x}
        cy={y}
        r="12"
        fill={fill}
        stroke={glow ?? stroke}
        strokeWidth={glow ? 3 : 1}
      />
      {n && (
        <text
          x={x}
          y={y + 4}
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fill={fill === FILL.IVORY ? "#222" : "#fff"}
        >
          {n}
        </text>
      )}
    </g>
  );
}

/** A stack slides to the first piece it meets and lands on it. */
function SlideFigure() {
  const xs = [40, 85, 130, 175, 220, 265];
  return (
    <svg
      viewBox="0 0 300 80"
      width="100%"
      role="img"
      aria-label="A stack slides over empty spots to the first piece it meets"
    >
      <rect width="300" height="80" rx="10" fill={WOOD} />
      <line x1="30" y1="45" x2="275" y2="45" stroke={LINE} strokeWidth="1.5" />
      {xs.map((x) => (
        <circle key={x} cx={x} cy="45" r="3" fill={LINE} />
      ))}
      <Disc x={40} y={45} fill={FILL.RED} stroke={STROKE.RED} n={2} />
      <Disc
        x={175}
        y={45}
        fill={FILL.BLUE}
        stroke={STROKE.BLUE}
        glow="#ffd86b"
      />
      <Disc x={265} y={45} fill={FILL.GREEN} stroke={STROKE.GREEN} />
      <path
        d="M54 32 Q108 0 162 32"
        fill="none"
        stroke="#ffd86b"
        strokeWidth="2.5"
        strokeDasharray="5 4"
      />
      <path
        d="M162 32 l-8 -3 M162 32 l-2 8"
        stroke="#ffd86b"
        strokeWidth="2.5"
      />
      <text x="150" y="72" fill="#f6edd0" fontSize="10" textAnchor="middle">
        never over a piece, never onto an empty spot
      </text>
    </svg>
  );
}

/** Your own colour works as a stepping stone: reach it, then carry on from it. */
function LinkFigure() {
  return (
    <svg
      viewBox="0 0 300 100"
      width="100%"
      role="img"
      aria-label="A piece of your colour links to another of the same colour and carries on from there"
    >
      <rect width="300" height="100" rx="10" fill={WOOD} />
      <line x1="30" y1="60" x2="200" y2="60" stroke={LINE} strokeWidth="1.5" />
      <line x1="200" y1="60" x2="270" y2="25" stroke={LINE} strokeWidth="1.5" />
      <Disc x={40} y={60} fill={FILL.RED} stroke={STROKE.RED} />
      <Disc x={200} y={60} fill={FILL.RED} stroke={STROKE.RED} glow="#4fd1c5" />
      <Disc
        x={270}
        y={25}
        fill={FILL.BLACK}
        stroke={STROKE.BLACK}
        glow="#ffd86b"
      />
      <path
        d="M54 48 Q120 15 186 48"
        fill="none"
        stroke="#4fd1c5"
        strokeWidth="2.5"
        strokeDasharray="5 4"
      />
      <path
        d="M210 48 L256 32"
        fill="none"
        stroke="#ffd86b"
        strokeWidth="2.5"
        strokeDasharray="5 4"
      />
      <text x="120" y="90" fill="#f6edd0" fontSize="10" textAnchor="middle">
        red is yours: pass through red, land on black
      </text>
    </svg>
  );
}

export default function LyngkRules() {
  return (
    <RulesDrawer title="How to play LYNGK">
      <Stack gap="md">
        <Text>
          The last game of the GIPF project by Kris Burm, and a blend of the
          others. Nobody owns anything at first. Claim two colours, build stacks
          of five different colours topped by yours, and take them off the
          board.
        </Text>

        <Title order={4}>Setup</Title>
        <Group gap="xs">
          {(["RED", "BLUE", "GREEN", "BLACK", "IVORY", "JOKER"] as const).map(
            (p) => (
              <PieceIcon key={p} piece={p} />
            ),
          )}
        </Group>
        <List>
          <List.Item>
            43 spots, 8 pieces of each of five colours and 3 white jokers, dealt
            out at random so every spot is filled.
          </List.Item>
          <List.Item>
            A joker stands for whichever colour a stack is missing. It never
            moves on its own.
          </List.Item>
        </List>

        <Title order={4}>Claiming colours</Title>
        <List>
          <List.Item>
            On your turn, before you move, you may claim one free colour. Two
            per player in all; the fifth stays neutral.
          </List.Item>
          <List.Item>
            A stack belongs to whoever has claimed the colour on top. Unclaimed
            tops are neutral.
          </List.Item>
        </List>

        <Title order={4}>A move</Title>
        <SlideFigure />
        <List>
          <List.Item>
            You must move one piece or stack: a neutral one, or one of yours.
            Never your opponent's.
          </List.Item>
          <List.Item>
            It goes in a straight line to the first piece it meets, crossing
            only empty spots, and lands on top of it.
          </List.Item>
          <List.Item>
            No colour may appear twice in a stack, jokers aside, and no stack is
            taller than five.
          </List.Item>
          <List.Item>
            A neutral single piece may only land on a single piece. A neutral
            stack may not land on anything taller than itself. Your own pieces
            and stacks may land on anything.
          </List.Item>
        </List>

        <Title order={4}>The LYNGK rule</Title>
        <LinkFigure />
        <List>
          <List.Item>
            Moving a piece or stack of your colour, you may stop at another
            piece of that same colour and carry on from it in a new line,
            without landing. Up to three links in one move, each used once.
          </List.Item>
        </List>

        <Title order={4}>Stacks of five</Title>
        <List>
          <List.Item>
            Complete a stack of five with your colour on top and it comes off
            the board as a point for you.
          </List.Item>
          <List.Item>
            A neutral stack of five stays where it is, as an obstacle, and
            scores nothing.
          </List.Item>
        </List>

        <Title order={4}>End</Title>
        <List>
          <List.Item>
            You may only pass when you have no move. The game ends when neither
            player can move.
          </List.Item>
          <List.Item>
            Most fives wins. Ties go to the most stacks of four controlled on
            the board, then threes, twos and singles.
          </List.Item>
        </List>
      </Stack>
    </RulesDrawer>
  );
}
