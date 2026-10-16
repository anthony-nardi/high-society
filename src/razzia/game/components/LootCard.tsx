import type { CSSProperties } from "react";
import { Text, Tooltip } from "@mantine/core";
import { LootCards } from "../types";
import cardInfo from "../cardInfo";
import BodyGuard from "../assets/Bodyguard";
import Bracelet from "../assets/Bracelet";
import Car from "../assets/Car";
import Casino from "../assets/Casino";
import Cross from "../assets/Cross";
import Driver from "../assets/Driver";
import Movie from "../assets/Movie";
import NightClub from "../assets/NightClub";
import Police from "../assets/Police";
import Racing from "../assets/Racing";
import RealEstate from "../assets/RealEstate";
import Restaurant from "../assets/Restaurant";
import Ring from "../assets/Ring";
import Scarab from "../assets/Scarab";
import Thief from "../assets/Thief";
import Tiara from "../assets/Tiara";
import Transportation from "../assets/Transportation";

export function LootArt({ card }: { card: LootCards }) {
  switch (card) {
    case "BODYGUARDS":
      return <BodyGuard />;
    case "BRACELET":
      return <Bracelet />;
    case "CARS":
      return <Car />;
    case "CASINO":
      return <Casino />;
    case "CROSS":
      return <Cross />;
    case "DRIVERS":
      return <Driver />;
    case "MOVIE_THEATER":
      return <Movie />;
    case "NIGHTCLUB":
      return <NightClub />;
    case "POLICE_RAIDS":
      return <Police />;
    case "RACING":
      return <Racing />;
    case "REAL_ESTATE":
      return <RealEstate />;
    case "RESTAURANT":
      return <Restaurant />;
    case "RING":
      return <Ring />;
    case "SCARAB":
      return <Scarab />;
    case "THIEF":
      return <Thief />;
    case "TIARA":
      return <Tiara />;
    case "TRANSPORTATION":
      return <Transportation />;
    default:
      return null;
  }
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
  /** Draws attention, e.g. the police card that started the auction. */
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
