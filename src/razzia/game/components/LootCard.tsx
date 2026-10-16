import type { CSSProperties } from "react";
import { Text, Tooltip } from "@mantine/core";
import { LootCards } from "../types";
import cardInfo from "../cardInfo";
import LootCardArt from "../assets/LootCardArt";

export function LootArt({ card }: { card: LootCards }) {
  return <LootCardArt card={card} />;
}

/**
 * A loot card at a given width, optionally captioned. Hovering, focusing
 * or tapping it explains what the card is and how it scores.
 */
export default function LootCard({
  card,
  width = 72,
  caption = false,
  selected = false,
  dimmed = false,
  highlighted = false,
  onClick,
  style,
}: {
  card: LootCards;
  width?: number | string;
  /** Show the card's name underneath. */
  caption?: boolean;
  selected?: boolean;
  dimmed?: boolean;
  /** Draws attention, e.g. the police raid that started the auction. */
  highlighted?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}) {
  const info = cardInfo(card);
  const frame: CSSProperties = {
    width,
    flex: "0 0 auto",
    borderRadius: 8,
    outline: selected
      ? "3px solid var(--mantine-color-yellow-5)"
      : highlighted
        ? "3px solid var(--mantine-color-red-5)"
        : undefined,
    boxShadow: selected
      ? "0 0 12px rgba(255, 216, 107, 0.7)"
      : highlighted
        ? "0 0 14px rgba(255, 80, 80, 0.8)"
        : undefined,
    opacity: dimmed ? 0.45 : 1,
    cursor: onClick ? "pointer" : "help",
    transition: "transform 150ms, box-shadow 150ms",
    ...style,
  };

  const content = (
    <>
      <LootArt card={card} />
      {caption && (
        <div
          style={{
            fontSize: 11,
            lineHeight: 1.1,
            textAlign: "center",
            marginTop: 3,
            color: "var(--mantine-color-dimmed)",
          }}
        >
          {info.name}
        </div>
      )}
    </>
  );

  const label = (
    <div>
      <Text size="sm" fw={700}>
        {info.name}
        <Text component="span" fw={400} c="dimmed">
          {" "}
          · {info.kind}
        </Text>
      </Text>
      <Text size="xs">{info.effect}</Text>
    </div>
  );

  const tooltipProps = {
    label,
    multiline: true,
    w: 260,
    withArrow: true,
    events: { hover: true, focus: true, touch: true },
    openDelay: 150,
  } as const;

  if (onClick) {
    return (
      <Tooltip {...tooltipProps}>
        <button
          type="button"
          onClick={onClick}
          aria-pressed={selected}
          aria-label={`${info.name}: ${info.effect}`}
          style={{ ...frame, padding: 0, border: 0, background: "none" }}
        >
          {content}
        </button>
      </Tooltip>
    );
  }

  return (
    <Tooltip {...tooltipProps}>
      <div
        role="img"
        tabIndex={0}
        aria-label={`${info.name}: ${info.effect}`}
        style={frame}
      >
        {content}
      </div>
    </Tooltip>
  );
}
