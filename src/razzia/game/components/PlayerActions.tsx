import { Button, Flex } from "@mantine/core";

export default function PlayerActions({
  isLoggedInUserActivePlayer,
}: {
  isLoggedInUserActivePlayer: boolean;
}) {
  return (
    <>
      <Flex align={"flex-end"} ml="sm">
        {isLoggedInUserActivePlayer && <Button mr="md">Reveal Card</Button>}
        {isLoggedInUserActivePlayer && <Button>Start Auction</Button>}
        {isLoggedInUserActivePlayer && <Button>Use Thief</Button>}
      </Flex>
    </>
  );
}
