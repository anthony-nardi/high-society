import { Box, Button, Flex, MultiSelect, Popover } from "@mantine/core";
import { PlayerState } from "../types";
import { useCallback, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";

export default function PlayerRoundState({
  player,
  isActivePlayer,
  lobbyId,
  isLoggedInUserActivePlayer,
}: {
  player: PlayerState;
  isActivePlayer: boolean;
  lobbyId: string;
  isLoggedInUserActivePlayer: boolean;
}) {
  const [stagedBid, setStagedBid] = useState<string[]>([]);
  const [actionsDisabled, setActionsDisabled] = useState<boolean>(false);

  const handlePassTurn = useCallback(async () => {
    setActionsDisabled(true);
    const functions = getFunctions();
    const passTurn = httpsCallable<any, any>(functions, "passturn");
    try {
      await passTurn({
        lobbyUID: lobbyId,
      });
      setActionsDisabled(false);
    } catch (e) {
      console.error(e);
    }
  }, [lobbyId]);

  const handleBid = useCallback(async () => {
    setActionsDisabled(true);
    const functions = getFunctions();
    const bid = httpsCallable<any, any>(functions, "bid");
    try {
      await bid({
        lobbyUID: lobbyId,
        bid: stagedBid,
      });
      setActionsDisabled(false);
      setStagedBid([]);
    } catch (e) {
      console.error(e);
    }
  }, [lobbyId, stagedBid]);

  return (
    <>
      {player.hasPassed ? (
        "PASSED"
      ) : (
        <div>Current Bid: {player.currentBid || 0}</div>
      )}
      {isLoggedInUserActivePlayer && (
        <Flex>
          <Button disabled={actionsDisabled} onClick={handlePassTurn}>
            Pass
          </Button>
        </Flex>
      )}
      {isLoggedInUserActivePlayer && (
        <Popover
          closeOnClickOutside={false}
          width={360}
          position="bottom"
          withArrow
          shadow="md"
        >
          <Popover.Target>
            <Button disabled={actionsDisabled}>Bid</Button>
          </Popover.Target>
          <Popover.Dropdown>
            <Flex align="end">
              <Box maw="200px">
                <MultiSelect
                  size="sm"
                  inputSize="sm"
                  hidePickedOptions
                  label="Select the cards from your hand to bid"
                  clearable
                  data={player.moneyCards}
                  value={stagedBid}
                  onChange={setStagedBid}
                  comboboxProps={{
                    position: "bottom",
                  }}
                />
              </Box>
              <Button disabled={actionsDisabled} ml={"sm"} onClick={handleBid}>
                Confirm Bid
              </Button>
            </Flex>
          </Popover.Dropdown>
        </Popover>
      )}
    </>
  );
}
