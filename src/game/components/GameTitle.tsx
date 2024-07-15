import { Center, Stack, Title } from "@mantine/core";

export default function GameTitle() {
  return (
    <Stack h={200} justify="space-around" gap="md">
      <Center>
        <Title order={1}>High Society</Title>
      </Center>
    </Stack>
  );
}
