import { useMemo } from "react";
import { RazziaPlayerState } from "../types";

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
        return m;
      } else {
        return "X";
      }
    });
  }, [availableMoney, money]);

  return <>{renderedMoney}</>;
}
