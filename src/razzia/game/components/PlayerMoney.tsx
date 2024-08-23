import { useMemo } from "react";
import { RazziaPlayerState } from "../types";
import Money from "../assets/Money";

export default function PlayerMoney({
  availableMoney,
  money,
}: {
  availableMoney: RazziaPlayerState["availableMoney"];
  money: RazziaPlayerState["money"];
}) {
  const renderedMoney = useMemo(() => {
    return money?.map((m) => {
      if (availableMoney?.includes(m)) {
        return <Money amount={m} isActive={true} />;
      } else {
        return <Money amount={m} isActive={false} />;
      }
    });
  }, [availableMoney, money]);

  return <>{renderedMoney}</>;
}
