import { Group, Text } from "@mantine/core";

const items: { swatch: React.ReactNode; text: string }[] = [
  {
    swatch: <Ring colour="#d64545" inner="#3b7dd8" />,
    text: "East coast: Red, Blue and Orange start here",
  },
  {
    swatch: <Ring colour="#8e5bc7" inner="#2b2b2b" />,
    text: "West coast: Purple starts here",
  },
  {
    swatch: <Ring colour="#c99700" label="★" />,
    text: "Chicago: $2 a build, no limit",
  },
  {
    swatch: <Ring colour="#2e8b57" label="$5" />,
    text: "$5 to the first railroad in",
  },
  { swatch: <Mountain />, text: "Mountains: cost one placement" },
  { swatch: <Passenger />, text: "Passenger waiting (dim: no rails out yet)" },
];

function Ring({
  colour,
  inner,
  label,
}: {
  colour: string;
  inner?: string;
  label?: string;
}) {
  return (
    <svg width="18" height="18" viewBox="-9 -9 18 18" aria-hidden="true">
      <circle r="7" fill="#fff" stroke={colour} strokeWidth="2.4" />
      {inner && <circle r="3.4" fill="none" stroke={inner} strokeWidth="1.6" />}
      {label && (
        <text
          y="2.6"
          textAnchor="middle"
          fontSize="7"
          fontWeight="800"
          fill={colour}
        >
          {label}
        </text>
      )}
    </svg>
  );
}

function Mountain() {
  return (
    <svg width="18" height="18" viewBox="-9 -9 18 18" aria-hidden="true">
      <circle r="8" fill="#c9b48d" />
      <path
        d="M -6 4 L -2 -3 L 0 0 L 2 -4 L 6 4 Z"
        fill="#a68b5b"
        stroke="#6b5635"
        strokeWidth="0.6"
      />
    </svg>
  );
}

function Passenger() {
  return (
    <svg width="18" height="18" viewBox="-9 -9 18 18" aria-hidden="true">
      <circle r="8" fill="#efe3c4" />
      <circle r="2.6" cy="-3" fill="#fff" stroke="#2a2118" strokeWidth="0.7" />
      <path
        d="M -4 5 Q 0 -1 4 5 Z"
        fill="#fff"
        stroke="#2a2118"
        strokeWidth="0.7"
      />
    </svg>
  );
}

/** What the markers on the map mean. */
export default function Legend() {
  return (
    <Group gap="sm" justify="center" wrap="wrap" aria-label="Map legend">
      {items.map((item) => (
        <Group key={item.text} gap={4} wrap="nowrap">
          {item.swatch}
          <Text size="xs" c="dimmed">
            {item.text}
          </Text>
        </Group>
      ))}
    </Group>
  );
}
