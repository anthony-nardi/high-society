import { List, Stack, Text, Title } from "@mantine/core";
import RulesDrawer from "../../../shared/components/RulesDrawer";

const WOOD = "#5c3d22";
const LINE = "rgba(28, 16, 6, 0.75)";
const WHITE = "#f1f1f1";
const BLACK = "#1a1a1a";

function Disc({
  x,
  y,
  fill,
  glow,
}: {
  x: number;
  y: number;
  fill: string;
  glow?: boolean;
}) {
  return (
    <g>
      <circle cx={x + 1.5} cy={y + 2} r="11" fill="#000" opacity="0.4" />
      <circle
        cx={x}
        cy={y}
        r="11"
        fill={fill}
        stroke={glow ? "#ff6b6b" : fill === WHITE ? "#8a8a8a" : "#000"}
        strokeWidth={glow ? 3 : 1}
      />
    </g>
  );
}

/** A piece comes in from a dot and shoves the line along to the first gap. */
function PushFigure() {
  const xs = [20, 60, 100, 140, 180, 220, 260];
  return (
    <svg
      viewBox="0 0 300 110"
      width="100%"
      role="img"
      aria-label="A piece pushed in from a dot shoves the line along to the first gap"
    >
      <rect width="300" height="110" rx="10" fill={WOOD} />
      {[30, 85].map((y, r) => (
        <g key={y}>
          <line x1="20" y1={y} x2="280" y2={y} stroke={LINE} strokeWidth="2" />
          <circle cx="20" cy={y} r="5" fill="#f6edd0" />
          <circle cx="280" cy={y} r="5" fill="#f6edd0" />
          {xs.slice(1).map((x) => (
            <circle key={x} cx={x} cy={y} r="3" fill={LINE} />
          ))}
          {r === 0 ? (
            <>
              <Disc x={20} y={y} fill={WHITE} />
              <Disc x={60} y={y} fill={BLACK} />
              <Disc x={100} y={y} fill={WHITE} />
              <Disc x={180} y={y} fill={BLACK} />
              <path
                d="M34 14 Q70 -4 106 14"
                fill="none"
                stroke="#ffd86b"
                strokeWidth="2.5"
                strokeDasharray="5 4"
              />
              <text
                x="235"
                y={y + 4}
                fill="#f6edd0"
                fontSize="10"
                textAnchor="middle"
              >
                before
              </text>
            </>
          ) : (
            <>
              <Disc x={60} y={y} fill={WHITE} />
              <Disc x={100} y={y} fill={BLACK} />
              <Disc x={140} y={y} fill={WHITE} />
              <Disc x={180} y={y} fill={BLACK} />
              <text
                x="235"
                y={y + 4}
                fill="#f6edd0"
                fontSize="10"
                textAnchor="middle"
              >
                after
              </text>
            </>
          )}
        </g>
      ))}
    </svg>
  );
}

/** Four in a row and everything touching them come off: yours back, theirs captured. */
function RowFigure() {
  const xs = [40, 80, 120, 160, 200, 240];
  return (
    <svg
      viewBox="0 0 300 80"
      width="100%"
      role="img"
      aria-label="Four in a row and the pieces touching them are removed"
    >
      <rect width="300" height="80" rx="10" fill={WOOD} />
      <line x1="20" y1="40" x2="280" y2="40" stroke={LINE} strokeWidth="2" />
      {xs.map((x, i) => (
        <Disc key={x} x={x} y={40} fill={i < 4 ? WHITE : BLACK} glow />
      ))}
      <text x="120" y="70" fill="#f6edd0" fontSize="10" textAnchor="middle">
        4 white back to reserve
      </text>
      <text x="220" y="70" fill="#ff9b9b" fontSize="10" textAnchor="middle">
        2 black captured
      </text>
    </svg>
  );
}

export default function GipfRules() {
  return (
    <RulesDrawer title="How to play GIPF">
      <Stack gap="md">
        <Text>
          The first game of the GIPF project by Kris Burm, in its basic form.
          Push pieces onto the board from the edge, line up four to get them
          back, and starve your opponent of pieces.
        </Text>

        <Title order={4}>Setup</Title>
        <List>
          <List.Item>
            15 pieces each: three start on the corner spots, colours
            alternating, and twelve wait in reserve.
          </List.Item>
          <List.Item>White pushes first.</List.Item>
        </List>

        <Title order={4}>A move</Title>
        <PushFigure />
        <List>
          <List.Item>
            Put a piece from your reserve on any of the 24 dots around the board
            and push it onto the adjacent spot along a line.
          </List.Item>
          <List.Item>
            If that spot is taken, every piece in the unbroken line ahead,
            whatever its colour, slides along one spot. A gap stops the shove.
          </List.Item>
          <List.Item>
            A line with no empty spot cannot be pushed: nothing may leave the
            board that way.
          </List.Item>
        </List>

        <Title order={4}>Four in a row</Title>
        <RowFigure />
        <List>
          <List.Item>
            Four of your pieces on adjacent spots in a straight line must come
            off, together with every piece of either colour touching them in
            that line, up to the first gap.
          </List.Item>
          <List.Item>
            Your own pieces go back to your reserve. Your opponent's are
            captured for good.
          </List.Item>
          <List.Item>
            The player who moved takes their rows first, then the other player
            takes any rows the move made for them. When two of your rows cross,
            you choose which to take.
          </List.Item>
        </List>

        <Title order={4}>End</Title>
        <List>
          <List.Item>
            If it is your turn and your reserve is empty, you have lost.
          </List.Item>
        </List>
      </Stack>
    </RulesDrawer>
  );
}
