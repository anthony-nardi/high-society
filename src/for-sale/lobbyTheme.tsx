import type { LobbyTheme } from "../shared/lobby/theme";
import BannerFan from "../shared/lobby/components/BannerFan";
import PropertyCard from "./game/components/PropertyCard";
import ChequeCard from "./game/components/ChequeCard";

/** The property ladder, from a cardboard box to a space station, with the cheques to match. */
const forSaleLobby: LobbyTheme = {
  accent: "#f0b429",
  background:
    "radial-gradient(ellipse at 50% -10%, rgba(240, 180, 41, 0.2), transparent 60%), linear-gradient(180deg, rgba(34, 48, 76, 0.94), rgba(12, 16, 28, 0.98))",
  banner: (
    <BannerFan
      cards={[
        <PropertyCard key="p1" property={1} width={46} />,
        <PropertyCard key="p9" property={9} width={46} />,
        <ChequeCard key="c0" amount={0} width={46} />,
        <PropertyCard key="p17" property={17} width={46} />,
        <ChequeCard key="c15" amount={15} width={46} />,
        <PropertyCard key="p25" property={25} width={46} />,
        <PropertyCard key="p30" property={30} width={46} />,
      ]}
    />
  ),
  flavour:
    "Buy low in the first half, sell high in the second. The best property on the table takes the biggest cheque.",
  seatIcons: ["🏠", "🏢", "🏰", "🚀", "🏚️", "🛖", "🏡"],
  botIcon: "🤖",
};

export default forSaleLobby;
