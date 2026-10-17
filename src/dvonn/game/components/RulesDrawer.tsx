import { List, Stack, Text, Title } from "@mantine/core";
import RulesDrawer from "../../../shared/components/RulesDrawer";

const WOOD = "#5c3d22";
const CELL = "rgba(0, 0, 0, 0.16)";
const EDGE = "rgba(28, 16, 6, 0.6)";
const WHITE = "#f1f1f1";
const BLACK = "#1a1a1a";
const RED = "#d9342b";

function hex(x: number, y: number, r = 22) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
}

function Cell({ x, y, glow }: { x: number; y: number; glow?: boolean }) {
  return (
    <polygon
      points={hex(x, y)}
      fill={glow ? "rgba(255, 216, 107, 0.3)" : CELL}
      stroke={glow ? "#ffd86b" : EDGE}
      strokeWidth={glow ? 3 : 1.5}
    />
  );
}

function Disc({
  x,
  y,
  fill,
  n,
}: {
  x: number;
  y: number;
  fill: string;
  n?: number;
}) {
  return (
    <g>
      <circle cx={x + 1.5} cy={y + 2} r="12" fill="#000" opacity="0.4" />
      <circle
        cx={x}
        cy={y}
        r="12"
        fill={fill}
        stroke={fill === WHITE ? "#8a8a8a" : "#000"}
      />
      {n && (
        <text
          x={x}
          y={y + 4}
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fill={fill === WHITE ? "#222" : "#fff"}
        >
          {n}
        </text>
      )}
    </g>
  );
}

/** A stack of two moves exactly two spaces, over anything, onto pieces. */
function MoveFigure() {
  const xs = [45, 90, 135, 180, 225, 270];
  return (
    <svg
      viewBox="0 0 310 80"
      width="100%"
      role="img"
      aria-label="A stack of two moves two spaces onto other pieces"
    >
      <rect width="310" height="80" rx="10" fill={WOOD} />
      {xs.map((x) => (
        <Cell key={x} x={x} y={45} glow={x === 180} />
      ))}
      <Disc x={45} y={45} fill={BLACK} />
      <Disc x={90} y={45} fill={WHITE} n={2} />
      <Disc x={180} y={45} fill={BLACK} />
      <Disc x={270} y={45} fill={RED} />
      <path
        d="M104 30 Q135 0 168 30"
        fill="none"
        stroke="#ffd86b"
        strokeWidth="2.5"
        strokeDasharray="5 4"
      />
      <path
        d="M168 30 l-8 -3 M168 30 l-2 8"
        stroke="#ffd86b"
        strokeWidth="2.5"
      />
      <text x="135" y="74" fill="#f6edd0" fontSize="10" textAnchor="middle">
        2 high, so exactly 2 spaces
      </text>
    </svg>
  );
}

/** Anything no longer linked to a red piece is removed. */
function CutFigure() {
  const xs = [45, 90, 135, 180, 225, 270];
  return (
    <svg
      viewBox="0 0 310 80"
      width="100%"
      role="img"
      aria-label="Pieces cut off from the DVONN pieces are removed"
    >
      <rect width="310" height="80" rx="10" fill={WOOD} />
      {xs.map((x) => (
        <Cell key={x} x={x} y={45} />
      ))}
      <Disc x={45} y={45} fill={RED} />
      <Disc x={90} y={45} fill={WHITE} />
      <g opacity="0.45">
        <Disc x={180} y={45} fill={BLACK} />
        <Disc x={225} y={45} fill={BLACK} n={3} />
      </g>
      <line
        x1="150"
        y1="20"
        x2="255"
        y2="70"
        stroke="#ff6b6b"
        strokeWidth="3"
      />
      <text x="135" y="18" fill="#f6edd0" fontSize="10" textAnchor="middle">
        the gap at the third space cuts these off
      </text>
    </svg>
  );
}

export default function DvonnRules() {
  return (
    <RulesDrawer title="How to play DVONN">
      <Stack gap="md">
        <Text>
          A two-player abstract from the GIPF project by Kris Burm. Fill the
          board, then jump stacks onto each other. Whatever loses touch with the
          three red DVONN pieces falls off the board. Control the most pieces at
          the end.
        </Text>

        <Title order={4}>Setup</Title>
        <List>
          <List.Item>
            49 spaces, 23 white pieces, 23 black pieces and 3 red DVONN pieces.
          </List.Item>
          <List.Item>
            Players alternate placing one piece on any empty space until the
            board is full. White starts and the three DVONN pieces go down
            first: white, black, white.
          </List.Item>
        </List>

        <Title order={4}>Moving</Title>
        <MoveFigure />
        <List>
          <List.Item>
            White moves first. You control a stack if your colour is on top.
          </List.Item>
          <List.Item>
            A stack moves as a whole, in a straight line, exactly as many spaces
            as it is tall, and must land on other pieces. It may pass over empty
            spaces on the way.
          </List.Item>
          <List.Item>
            A stack whose six neighbours are all occupied cannot move. Pieces on
            the edge can always move.
          </List.Item>
          <List.Item>
            A lone DVONN piece never moves, but a stack carries one along.
          </List.Item>
        </List>

        <Title order={4}>Losing pieces</Title>
        <CutFigure />
        <List>
          <List.Item>
            After every move, any stack not linked, directly or through a chain
            of pieces, to a DVONN piece is removed at once.
          </List.Item>
        </List>

        <Title order={4}>End</Title>
        <List>
          <List.Item>
            You may only pass when you have no move. The game ends when neither
            player can move.
          </List.Item>
          <List.Item>
            Each player counts the pieces in the stacks they control, DVONN
            pieces included. The higher total wins; equal is a draw.
          </List.Item>
        </List>
      </Stack>
    </RulesDrawer>
  );
}
