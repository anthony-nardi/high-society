import { Flex } from "@mantine/core";

export default function PlayerChips({ chips }: { chips: number }) {
  return (
    <b>
      <Flex>Chips: {chips}</Flex>
    </b>
  );
}
