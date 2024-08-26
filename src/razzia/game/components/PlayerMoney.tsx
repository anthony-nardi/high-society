import { useMemo } from "react";
import { RazziaGameState, RazziaPlayerState } from "../types";
import Money from "../assets/Money";
import useGameState from "../../../shared/hooks/useGameState";

export default function PlayerMoney({
  availableMoney,
  money,
  isLoggedInUserActivePlayer,
}: {
  availableMoney: RazziaPlayerState["availableMoney"];
  money: RazziaPlayerState["money"];
  isLoggedInUserActivePlayer: boolean;
}) {
  const { gameState } = useGameState<RazziaGameState>();

  const isAuction = useMemo(() => {
    if (!gameState) {
      return false;
    }

    return (
      gameState?.roundState === "NORMAL_AUCTION" ||
      gameState?.roundState === "FORCED_AUCTION"
    );
  }, [gameState]);

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
