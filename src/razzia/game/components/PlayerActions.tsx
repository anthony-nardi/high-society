import { Button, Flex } from "@mantine/core";
import { useCallback, useState } from "react";
import revealCard from "../../client/revealCard";
import { useLobbyContext } from "../../../shared/context/useLobbyContext";
import initiateAuction from "../../client/initiateAuction";
import activateTheif from "../../client/useThief";
import useGameState from "../../../shared/hooks/useGameState";
import { RazziaGameState } from "../types";
import bidOnLoot from "../../client/bidOnLoot";
import passOnLoot from "../../client/passOnLoot";

export default function PlayerActions({
  isLoggedInUserActivePlayer,
}: {
  isLoggedInUserActivePlayer: boolean;
}) {
  const { lobbyId } = useLobbyContext();
  const [actionsDisabled, setActionsDisabled] = useState(false);
  const { gameState } = useGameState<RazziaGameState>();

  const handleRevealCard = useCallback(async () => {
    setActionsDisabled(true);
    await revealCard({
      lobbyUID: `${lobbyId}`,
    });
    setActionsDisabled(false);
  }, [lobbyId]);

  const handleStartAuction = useCallback(async () => {
    setActionsDisabled(true);
    await initiateAuction({
      lobbyUID: `${lobbyId}`,
    });
    setActionsDisabled(false);
  }, [lobbyId]);

  const handleUseThief = useCallback(async () => {
    setActionsDisabled(true);
    await activateTheif({
      lobbyUID: `${lobbyId}`,
      cardToSteal: [],
    });
    setActionsDisabled(false);
  }, [lobbyId]);

  const handleBidOnLoot = useCallback(async () => {
    setActionsDisabled(true);
    await bidOnLoot({
      lobbyUID: `${lobbyId}`,
      amount: "1",
    });
    setActionsDisabled(false);
  }, [lobbyId]);

  const handlePassOnLoot = useCallback(async () => {
    setActionsDisabled(true);
    await passOnLoot({
      lobbyUID: `${lobbyId}`,
    });
    setActionsDisabled(false);
  }, [lobbyId]);

  if (!gameState) {
    return null;
  }

  if (gameState.roundState === "ACTION") {
    return (
      <Flex align={"flex-end"} ml="sm">
        {isLoggedInUserActivePlayer && (
          <Button mr="md" onClick={handleRevealCard} disabled={actionsDisabled}>
            Reveal Card
          </Button>
        )}
        {isLoggedInUserActivePlayer && (
          <Button
            mr="md"
            onClick={handleStartAuction}
            disabled={actionsDisabled}
          >
            Start Auction
          </Button>
        )}
        {isLoggedInUserActivePlayer && (
          <Button onClick={handleUseThief} disabled={actionsDisabled}>
            Use Thief
          </Button>
        )}
      </Flex>
    );
  }

  if (
    gameState.roundState === "NORMAL_AUCTION" ||
    gameState.roundState === "FORCED_AUCTION"
  ) {
    return (
      <Flex align={"flex-end"} ml="sm">
        {isLoggedInUserActivePlayer && (
          <Button mr="md" onClick={handleBidOnLoot} disabled={actionsDisabled}>
            Bid
          </Button>
        )}
        {isLoggedInUserActivePlayer && (
          <Button onClick={handlePassOnLoot} disabled={actionsDisabled}>
            Pass
          </Button>
        )}
      </Flex>
    );
  }

  return null;
}
