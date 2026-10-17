import { Center, Stack, Text, Title } from "@mantine/core";
import { useGameStateContext } from "../../../shared/context/GameStateProvider";

export default function GameTitle() {
  const { gameState } = useGameStateContext("family-inc");

  if (gameState) {
    return null;
  }

  return (
    <Stack h={200} justify="center" gap={4}>
      <Center>
        <Title
          order={1}
          style={{ fontSize: "clamp(40px, 10vw, 80px)", letterSpacing: 2 }}
        >
          Family Inc.
        </Title>
      </Center>
      <Center>
        <Text c="dimmed" ta="center" px="md">
          Push your luck, rob the family. 2 to 7 players, designed by Reiner
          Knizia.
        </Text>
      </Center>
    </Stack>
  );
}
