import type { CSSProperties } from "react";
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

/** A loot card at a given width, with its name and rule as a tooltip. */
export default function LootCard({
  card,
  width = 72,
  selected = false,
  dimmed = false,
  onClick,
  style,
}: {
  card: LootCards;
  width?: number | string;
  selected?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}) {
  const info = cardInfo(card);
  const frame: CSSProperties = {
    width,
    flex: "0 0 auto",
    borderRadius: 8,
    outline: selected ? "3px solid var(--mantine-color-yellow-5)" : undefined,
    boxShadow: selected ? "0 0 12px rgba(255, 216, 107, 0.7)" : undefined,
    opacity: dimmed ? 0.45 : 1,
    cursor: onClick ? "pointer" : undefined,
    transition: "transform 150ms, box-shadow 150ms",
    ...style,
  };

  const content = <LootArt card={card} />;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        aria-label={info.name}
        title={`${info.name}: ${info.effect}`}
        style={{ ...frame, padding: 0, border: 0, background: "none" }}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      role="img"
      aria-label={info.name}
      title={`${info.name}: ${info.effect}`}
      style={frame}
    >
      {content}
    </div>
  );
}
