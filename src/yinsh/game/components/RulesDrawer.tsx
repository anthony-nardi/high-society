import { List, Stack, Text, Title } from "@mantine/core";
import RulesDrawer from "../../../shared/components/RulesDrawer";

const WOOD = "#5c3d22";
const LINE = "rgba(28, 16, 6, 0.7)";
const WHITE = "#f1f1f1";
const BLACK = "#1a1a1a";

function Marker({ x, y, white }: { x: number; y: number; white: boolean }) {
  return (
    <circle
      cx={x}
      cy={y}
      r="9"
      fill={white ? WHITE : BLACK}
      stroke={white ? "#8a8a8a" : "#000"}
    />
  );
}

function Ring({
  x,
  y,
  white,
  glow,
}: {
  x: number;
  y: number;
  white: boolean;
  glow?: boolean;
}) {
  return (
    <circle
      cx={x}
      cy={y}
      r="13"
      fill="none"
      stroke={glow ? "#ffd86b" : white ? WHITE : BLACK}
      strokeWidth="5"
    />
  );
}

/** A ring sliding over three markers to the first empty point beyond, flipping them. */
function MoveFigure() {
  const xs = [30, 70, 110, 150, 190, 230, 270];
  return (
    <svg
      viewBox="0 0 300 120"
      width="100%"
      role="img"
      aria-label="A ring jumps a run of markers and flips them"
    >
      <rect width="300" height="120" rx="10" fill={WOOD} />
      {/* before */}
      <line x1="20" y1="35" x2="280" y2="35" stroke={LINE} strokeWidth="1.5" />
      {xs.map((x) => (
        <circle key={x} cx={x} cy="35" r="3" fill={LINE} />
      ))}
      <Ring x={30} y={35} white />
      <Marker x={70} y={35} white={false} />
      <Marker x={110} y={35} white />
      <Marker x={150} y={35} white={false} />
      <path
        d="M48 20 Q120 -5 190 20"
        fill="none"
        stroke="#ffd86b"
        strokeWidth="2.5"
        strokeDasharray="5 4"
      />
      <path
        d="M190 20 l-8 -4 M190 20 l-3 8"
        stroke="#ffd86b"
        strokeWidth="2.5"
      />
      <text x="258" y="20" fill="#f6edd0" fontSize="10" textAnchor="middle">
        before
      </text>
      {/* after */}
      <line x1="20" y1="90" x2="280" y2="90" stroke={LINE} strokeWidth="1.5" />
      {xs.map((x) => (
        <circle key={x} cx={x} cy="90" r="3" fill={LINE} />
      ))}
      <Marker x={30} y={90} white />
      <Marker x={70} y={90} white />
      <Marker x={110} y={90} white={false} />
      <Marker x={150} y={90} white />
      <Ring x={190} y={90} white glow />
      <text x="258" y="112" fill="#f6edd0" fontSize="10" textAnchor="middle">
        after
      </text>
    </svg>
  );
}

/** Five in a row, then a ring comes off. */
function RowFigure() {
  return (
    <svg
      viewBox="0 0 300 80"
      width="100%"
      role="img"
      aria-label="Five markers in a row score a ring"
    >
      <rect width="300" height="80" rx="10" fill={WOOD} />
      <line x1="20" y1="40" x2="220" y2="40" stroke={LINE} strokeWidth="1.5" />
      {[40, 75, 110, 145, 180].map((x) => (
        <g key={x}>
          <circle
            cx={x}
            cy="40"
            r="15"
            fill="rgba(255, 107, 107, 0.35)"
            stroke="#ff6b6b"
            strokeWidth="2"
          />
          <Marker x={x} y={40} white />
        </g>
      ))}
      <path d="M210 40 L240 40" stroke="#f6edd0" strokeWidth="2" />
      <path d="M240 40 l-6 -4 M240 40 l-6 4" stroke="#f6edd0" strokeWidth="2" />
      <Ring x={268} y={40} white glow />
      <text x="268" y="70" fill="#f6edd0" fontSize="10" textAnchor="middle">
        +1 ring
      </text>
    </svg>
  );
}

export default function YinshRules() {
  return (
    <RulesDrawer title="How to play YINSH">
      <Stack gap="md">
        <Text>
          A two-player abstract from the GIPF project by Kris Burm. Rings move
          and leave markers behind; markers flip whenever a ring jumps them.
          Line up five of your colour and you score a ring. Three rings win.
        </Text>

        <Title order={4}>Setup</Title>
        <List>
          <List.Item>Each player has five rings; white starts.</List.Item>
          <List.Item>
            Players alternate placing one ring at a time on any vacant point
            until all ten are down.
          </List.Item>
          <List.Item>
            51 markers, white on one side and black on the other, sit in a
            shared pool.
          </List.Item>
        </List>

        <Title order={4}>A move</Title>
        <MoveFigure />
        <List>
          <List.Item>
            Pick one of your rings. A marker of your colour goes where it stood,
            and the ring moves in a straight line.
          </List.Item>
          <List.Item>
            It may cross any number of vacant points. It may jump over an
            unbroken run of markers of any colour, but must then stop on the
            first vacant point after them. It can never pass a ring.
          </List.Item>
          <List.Item>
            Every marker the ring jumped is flipped to the other colour.
          </List.Item>
        </List>

        <Title order={4}>Rows</Title>
        <RowFigure />
        <List>
          <List.Item>
            Five markers of one colour in an unbroken straight line make a row.
            Rings do not count.
          </List.Item>
          <List.Item>
            The owner of the colour removes those five markers and then one of
            their own rings. More than five in a line: choose which five.
          </List.Item>
          <List.Item>
            You can flip a row into existence for your opponent. The mover
            resolves their own rows first, then the opponent resolves theirs,
            before the next move.
          </List.Item>
        </List>

        <Title order={4}>Winning</Title>
        <List>
          <List.Item>The first player to remove three rings wins.</List.Item>
          <List.Item>
            If the markers run out first, the player who removed more rings
            wins; equal is a draw.
          </List.Item>
        </List>
      </Stack>
    </RulesDrawer>
  );
}
