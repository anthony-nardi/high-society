import { Group, List, Stack, Text, Title } from "@mantine/core";
import RulesDrawer from "../../../shared/components/RulesDrawer";
import Marble from "./Marble";

const WOOD = "#5c3d22";
const HOOP = "#d9bd91";
const MARBLE: { [c: string]: [string, string] } = {
  WHITE: ["#ffffff", "#b9b9b9"],
  GRAY: ["#b0b0b0", "#4f4f4f"],
  BLACK: ["#5a5a5a", "#050505"],
};

function Hoop({
  x,
  y,
  glow,
  dashed,
}: {
  x: number;
  y: number;
  glow?: string;
  dashed?: boolean;
}) {
  return (
    <circle
      cx={x}
      cy={y}
      r="15"
      fill="rgba(0,0,0,0.28)"
      stroke={glow ?? HOOP}
      strokeWidth="5"
      strokeDasharray={dashed ? "5 4" : undefined}
    />
  );
}

function Ball({
  x,
  y,
  colour,
  id,
}: {
  x: number;
  y: number;
  colour: string;
  id: string;
}) {
  const [a, b] = MARBLE[colour];
  return (
    <>
      <defs>
        <radialGradient id={id} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor={a} />
          <stop offset="100%" stopColor={b} />
        </radialGradient>
      </defs>
      <circle cx={x + 1.5} cy={y + 2} r="10" fill="#000" opacity="0.4" />
      <circle cx={x} cy={y} r="10" fill={`url(#${id})`} stroke="#1b1b1b" />
    </>
  );
}

/** Place a marble, then slide a free ring off the edge. */
function PlaceFigure() {
  const row = (y: number, xs: number[]) =>
    xs.map((x) => [x, y] as [number, number]);
  const pts = [
    ...row(30, [110, 150, 190]),
    ...row(65, [90, 130, 170, 210]),
    ...row(100, [110, 150, 190]),
  ];
  return (
    <svg
      viewBox="0 0 300 130"
      width="100%"
      role="img"
      aria-label="Place a marble, then remove a ring from the edge"
    >
      <rect width="300" height="130" rx="10" fill={WOOD} />
      {pts.map(([x, y], i) => (
        <Hoop
          key={i}
          x={x}
          y={y}
          glow={i === 9 ? "#ff6b6b" : undefined}
          dashed={i === 9}
        />
      ))}
      <Ball x={130} y={65} colour="GRAY" id="rules-place-gray" />
      <Ball x={150} y={30} colour="BLACK" id="rules-place-black" />
      <Hoop x={170} y={65} glow="#ffd86b" />
      <text x="40" y="70" fill="#f6edd0" fontSize="10">
        1. place
      </text>
      <text x="228" y="104" fill="#f6edd0" fontSize="10">
        2. remove
      </text>
      <path
        d="M190 112 Q215 130 240 118"
        fill="none"
        stroke="#ff6b6b"
        strokeWidth="2"
        strokeDasharray="4 3"
      />
    </svg>
  );
}

/** A marble jumps an adjacent marble onto the vacant ring beyond and takes it. */
function JumpFigure() {
  return (
    <svg
      viewBox="0 0 300 90"
      width="100%"
      role="img"
      aria-label="A marble jumps over a neighbour and captures it"
    >
      <rect width="300" height="90" rx="10" fill={WOOD} />
      {[60, 110, 160, 210].map((x) => (
        <Hoop key={x} x={x} y={55} glow={x === 160 ? "#ffd86b" : undefined} />
      ))}
      <Ball x={60} y={55} colour="WHITE" id="rules-jump-white" />
      <Ball x={110} y={55} colour="BLACK" id="rules-jump-black" />
      <path
        d="M72 42 Q110 5 148 42"
        fill="none"
        stroke="#ffd86b"
        strokeWidth="2.5"
        strokeDasharray="5 4"
      />
      <path
        d="M148 42 l-8 -3 M148 42 l-2 8"
        stroke="#ffd86b"
        strokeWidth="2.5"
      />
      <text x="250" y="60" fill="#f6edd0" fontSize="10" textAnchor="middle">
        takes black
      </text>
    </svg>
  );
}

export default function ZertzRules() {
  return (
    <RulesDrawer title="How to play ZÈRTZ">
      <Stack gap="md">
        <Text>
          A two-player abstract from the GIPF project by Kris Burm. The board is
          37 rings, and it shrinks every turn. Capture marbles by jumping, and
          be the first to collect a winning set.
        </Text>

        <Title order={4}>The marbles</Title>
        <Group gap="md">
          <Group gap={4}>
            <Marble colour="WHITE" /> <Text size="sm">6 white</Text>
          </Group>
          <Group gap={4}>
            <Marble colour="GRAY" /> <Text size="sm">8 gray</Text>
          </Group>
          <Group gap={4}>
            <Marble colour="BLACK" /> <Text size="sm">10 black</Text>
          </Group>
        </Group>
        <Text size="sm">
          Nobody owns the marbles. They all sit in one shared pool until they
          are placed, and any marble on the board can be used by either player.
        </Text>

        <Title order={4}>Your turn</Title>
        <PlaceFigure />
        <JumpFigure />
        <List>
          <List.Item>
            <b>Place</b> a marble from the pool on any vacant ring, then
            <b> remove</b> a vacant ring from the edge: one with two adjacent
            sides free, so it can slide out. If no ring can go, you skip that.
          </List.Item>
          <List.Item>
            <b>Capture</b> if you can, and you must: jump a marble over an
            adjacent marble onto the vacant ring directly beyond, taking the
            marble you jumped. If the same marble can jump again, it must.
            Capturing replaces placing for that turn.
          </List.Item>
          <List.Item>
            If removing a ring cuts off a group of rings and every ring in it is
            occupied, you take all the marbles on it.
          </List.Item>
        </List>

        <Title order={4}>Winning</Title>
        <List>
          <List.Item>Three marbles of each colour, or</List.Item>
          <List.Item>four white, or five gray, or six black.</List.Item>
          <List.Item>
            When the pool runs out you place marbles from your own captures. A
            player who can neither place nor capture loses.
          </List.Item>
        </List>
      </Stack>
    </RulesDrawer>
  );
}
