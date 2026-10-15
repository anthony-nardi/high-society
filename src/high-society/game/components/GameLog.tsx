import { Paper, ScrollArea, Stack, Table, Text, Title } from "@mantine/core";
import { LogEntry } from "../types";
import displayName from "../../../shared/utils/displayName";

/** Replaces email addresses and bot ids in a server message with display names. */
function prettify(text: string) {
  return text.replace(/\S+@\S+\.\S+|Bot #\d+/g, (name) => displayName(name));
}

function formatClock(timestamp: number, start: number) {
  const seconds = Math.max(0, Math.round((timestamp - start) / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Every event of the finished game, in order, with time since the start. */
export default function GameLog({ log }: { log: LogEntry[] }) {
  if (log.length === 0) {
    return null;
  }
  const start = log[0].timestamp;

  return (
    <Stack gap="xs">
      <Title order={4}>Game log</Title>
      <Paper withBorder radius="md">
        <ScrollArea.Autosize mah={360} type="auto">
          <Table verticalSpacing={4} data-testid="game-log">
            <Table.Tbody>
              {log.map((entry, index) => (
                <Table.Tr key={`${entry.timestamp}-${index}`}>
                  <Table.Td w={64} c="dimmed" ff="monospace" fz="xs">
                    {formatClock(entry.timestamp, start)}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{prettify(entry.title)}</Text>
                    {entry.message && (
                      <Text size="xs" c="dimmed">
                        {prettify(entry.message)}
                      </Text>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea.Autosize>
      </Paper>
    </Stack>
  );
}
