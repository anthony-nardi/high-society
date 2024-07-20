import {
  Box,
  Button,
  Flex,
  MultiSelect,
  Popover,
  Tooltip,
} from "@mantine/core";
import { PlayerState } from "../types";
import { useCallback, useMemo, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";

export default function PlayerRoundState({
  player,
  lobbyId,
  isLoggedInUserActivePlayer,
  highestBidTotal,
}: {
  player: PlayerState;
  lobbyId: string;
  isLoggedInUserActivePlayer: boolean;
  highestBidTotal: number;
}) {
  const [stagedBid, setStagedBid] = useState<string[]>([]);
  const [actionsLoading, setActionsLoading] = useState<boolean>(false);

  const currentTotalBid = useMemo(() => {
    if (!player.currentBid) return 0;

    return player.currentBid.reduce((sum, curr) => {
      return Number(sum) + Number(curr);
    }, 0);
  }, [player.currentBid]);

  const isStagedBidHigherThanHighestBid = useMemo(() => {
    const stagedBidTotal = stagedBid.reduce(
      (sum, current) => Number(sum) + Number(current),
      0
    );

    return stagedBidTotal + currentTotalBid > highestBidTotal;
  }, [currentTotalBid, highestBidTotal, stagedBid]);

  const handlePassTurn = useCallback(async () => {
    setStagedBid([]);
    setActionsLoading(true);
    const functions = getFunctions();
    const passTurn = httpsCallable<
      {
        lobbyUID: string;
      },
      object
    >(functions, "passturn");
    try {
      await passTurn({
        lobbyUID: lobbyId,
      });
      setActionsLoading(false);
    } catch (e) {
      console.error(e);
    }
  }, [lobbyId]);

  const handleBid = useCallback(async () => {
    setActionsLoading(true);
    const functions = getFunctions();
    const bid = httpsCallable<
      {
        lobbyUID: string;
        bid: string[];
      },
      object
    >(functions, "bid");
    try {
      await bid({
        lobbyUID: lobbyId,
        bid: stagedBid,
      });
      setActionsLoading(false);
      setStagedBid([]);
    } catch (e) {
      console.error(e);
    }
  }, [lobbyId, stagedBid]);

  const renderedPlayerBid = useMemo(() => {
    if (!player.currentBid) return 0;

    const cardsCommited = player.currentBid.join(", ");

    const totalAmountBid = player.currentBid.reduce((sum, curr) => {
      return Number(sum) + Number(curr);
    }, 0);

    return `${cardsCommited} (total: ${totalAmountBid})`;
  }, [player.currentBid]);

  return (
    <>
      {player.hasPassed ? (
        "PASSED"
      ) : (
        <div style={{ marginBottom: "12px" }}>
          Current Bid: {renderedPlayerBid}
        </div>
      )}
      <Flex align={"flex-end"}>
        {isLoggedInUserActivePlayer && (
          <Flex>
            <Button
              mr="md"
              disabled={actionsLoading}
              loading={actionsLoading}
              onClick={handlePassTurn}
            >
              Pass
            </Button>
          </Flex>
        )}
        {isLoggedInUserActivePlayer && (
          <Popover
            closeOnClickOutside={false}
            width={400}
            position="bottom"
            withArrow
            shadow="md"
          >
            <Popover.Target>
              <Button disabled={actionsLoading} loading={actionsLoading}>
                Bid
              </Button>
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
                    data={(player.moneyCards || []).sort(function (a, b) {
                      return Number(a) - Number(b);
                    })}
                    value={stagedBid}
                    onChange={setStagedBid}
                    comboboxProps={{
                      position: "bottom",
                    }}
                  />
                </Box>
                {actionsLoading || !isStagedBidHigherThanHighestBid ? (
                  <Tooltip label={`Bid must be higher than ${highestBidTotal}`}>
                    <Button
                      disabled={
                        actionsLoading || !isStagedBidHigherThanHighestBid
                      }
                      loading={actionsLoading}
                      ml={"md"}
                      onClick={handleBid}
                    >
                      Confirm Bid
                    </Button>
                  </Tooltip>
                ) : (
                  <Button ml={"md"} onClick={handleBid}>
                    Confirm Bid
                  </Button>
                )}
              </Flex>
            </Popover.Dropdown>
          </Popover>
        )}
      </Flex>
    </>
  );
}
