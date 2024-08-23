import { Button, Flex } from "@mantine/core";
import { useCallback } from "react";
import revealCard from "../../client/revealCard";
import { useLobbyContext } from "../../../shared/context/useLobbyContext";
import initiateAuction from "../../client/initiateAuction";

export default function PlayerActions({
  isLoggedInUserActivePlayer,
}: {
  isLoggedInUserActivePlayer: boolean;
}) {
  const { lobbyId } = useLobbyContext();

  const handleRevealCard = useCallback(async () => {
    await revealCard({
      lobbyUID: `${lobbyId}`,
    });
  }, [lobbyId]);

  const handleStartAuction = useCallback(async () => {
    await initiateAuction({
      lobbyUID: `${lobbyId}`,
    });
  }, [lobbyId]);

  const handleUseThief = useCallback(() => {
    console.log("Use Thief");
  }, []);

  return (
    <Flex align={"flex-end"} ml="sm">
      {isLoggedInUserActivePlayer && (
        <Button mr="md" onClick={handleRevealCard}>
          Reveal Card
        </Button>
      )}
      {isLoggedInUserActivePlayer && (
        <Button mr="md" onClick={handleStartAuction}>
          Start Auction
        </Button>
      )}
      {isLoggedInUserActivePlayer && (
        <Button onClick={handleUseThief}>Use Thief</Button>
      )}
    </Flex>
  );
}
