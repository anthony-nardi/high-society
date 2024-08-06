import { Button, Flex } from "@mantine/core";
import { useCallback, useState } from "react";
import takeActiveCard from "../../client/takeActiveCard";
import placeChip from "../../client/placeChip";
import { useLobbyContext } from "../../../shared/context/useLobbyContext";

export default function PlayerRoundState({
  isLoggedInUserActivePlayer,
}: {
  isLoggedInUserActivePlayer: boolean;
}) {
  const { lobbyId } = useLobbyContext();

  const [actionsLoading, setActionsLoading] = useState<boolean>(false);

  const handleTakeActiveCard = useCallback(async () => {
    setActionsLoading(true);

    await takeActiveCard({ lobbyUID: lobbyId || 0 });

    setActionsLoading(false);
  }, [lobbyId]);

  const handlePlaceChip = useCallback(async () => {
    setActionsLoading(true);

    await placeChip({
      lobbyUID: lobbyId || 0,
    });

    setActionsLoading(false);
  }, [lobbyId]);

  return (
    <>
      <Flex align={"flex-end"}>
        {isLoggedInUserActivePlayer && (
          <Flex>
            <Button
              mr="md"
              disabled={actionsLoading}
              loading={actionsLoading}
              onClick={handleTakeActiveCard}
            >
              Take Card
            </Button>
          </Flex>
        )}
        {isLoggedInUserActivePlayer && (
          <Button
            disabled={actionsLoading}
            loading={actionsLoading}
            onClick={handlePlaceChip}
          >
            Place Chip
          </Button>
        )}
      </Flex>
    </>
  );
}
