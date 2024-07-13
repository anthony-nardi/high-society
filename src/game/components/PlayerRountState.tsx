import { Box, Button, Flex, MultiSelect, Popover } from "@mantine/core";
import { PlayerState } from "../types";
import { useState } from "react";

export default function PlayerRoundState({
  player,
  isActivePlayer,
}: {
  player: PlayerState;
  isActivePlayer: boolean;
}) {
  const [stagedBid, setStagedBid] = useState<string[]>([]);

  return (
    <>
      {player.hasPassed ? (
        "PASSED"
      ) : (
        <div>Current Bid: {player.currentBid || 0}</div>
      )}
      {isActivePlayer && (
        <Flex>
          <Button>Pass</Button>
        </Flex>
      )}
      {isActivePlayer && (
        <Popover
          closeOnClickOutside={false}
          width={360}
          position="bottom"
          withArrow
          shadow="md"
        >
          <Popover.Target>
            <Button>Bid</Button>
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
              <Button ml={"sm"}>Confirm Bid</Button>
            </Flex>
          </Popover.Dropdown>
        </Popover>
      )}
    </>
  );
}
