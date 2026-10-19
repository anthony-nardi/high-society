import { Center, Stack, Text, Title } from "@mantine/core";
import { useGameStateContext } from "../../../shared/context/GameStateProvider";

export default function GameTitle() {
  const { gameState } = useGameStateContext("coral-reef");

  if (gameState) {
    return null;
  }

  return (
    <Stack h={200} justify="center" gap={4}>
      <Center>
        <Title
          order={1}
          ta="center"
          style={{ fontSize: "clamp(32px, 8vw, 72px)", letterSpacing: 3 }}
        >
          Ecosystem: Coral Reef
        </Title>
      </Center>
      <Center>
        <Text c="dimmed" ta="center" px="md">
          Draft a reef, four by five, and keep its food web in balance. 2 to 6
          players, by Matt Simpson and Steve Schlepphorst.
        </Text>
      </Center>
    </Stack>
  );
}
