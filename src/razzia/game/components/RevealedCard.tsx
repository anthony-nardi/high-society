import { LootCards } from "../types";
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

export default function RevealedCard({ card }: { card: LootCards }) {
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
