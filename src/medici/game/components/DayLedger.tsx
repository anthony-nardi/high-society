import { Badge, Group, Modal, Stack, Table, Text, Title } from "@mantine/core";
import type { DayScoring, MediciGameState } from "../types";
import displayName from "../../../shared/utils/displayName";
import CardFace from "./CardFace";
import { COMMODITY_INFO, commodityName, lotLabel, sortedShip } from "../board";
import classes from "../medici.module.css";

/** The day's payouts, row by row: the ships, each track, and the totals. */
export function Ledger({
  scoring,
  gameState,
  me,
}: {
  scoring: DayScoring;
  gameState: MediciGameState;
  me?: string | null;
}) {
  const players = gameState.players;
  const you = (email: string) =>
    email === me ? (
      <Text component="span" size="xs" c="dimmed">
        {" "}
        (you)
      </Text>
    ) : null;
  let row = 0;
  const delay = () => ({ animationDelay: `${row++ * 90}ms` });

  return (
    <Stack gap="md" data-testid="ledger">
      {scoring.freeFill && (
        <Text size="sm" c="dimmed" className="merger-row" style={delay()}>
          {displayName(scoring.freeFill.email)}
          {you(scoring.freeFill.email)} was the last ship afloat and filled the
          hold for nothing: {lotLabel(scoring.freeFill.cards)}.
        </Text>
      )}
      <div>
        <Title order={5}>Ships</Title>
        <Table fz="sm" verticalSpacing={4}>
          <Table.Tbody>
            {scoring.ships.map((s) => (
              <Table.Tr key={s.email} className="merger-row" style={delay()}>
                <Table.Td style={{ whiteSpace: "nowrap" }}>
                  {displayName(s.email)}
                  {you(s.email)}
                </Table.Td>
                <Table.Td>
                  <Group gap={2} wrap="wrap">
                    {sortedShip(s.cards || []).map((c, i) => (
                      <CardFace key={i} card={c} width={26} decorative />
                    ))}
                    {!(s.cards || []).length && (
                      <Text size="xs" c="dimmed">
                        sailed empty
                      </Text>
                    )}
                  </Group>
                </Table.Td>
                <Table.Td ta="right" style={{ whiteSpace: "nowrap" }}>
                  value {s.value}
                </Table.Td>
                <Table.Td ta="right" style={{ whiteSpace: "nowrap" }}>
                  <Badge
                    color={s.pay ? "green" : "gray"}
                    variant={s.pay ? "filled" : "light"}
                    radius="sm"
                  >
                    +{s.pay}
                  </Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </div>
      <div>
        <Title order={5}>Tracks</Title>
        <Table.ScrollContainer minWidth={320}>
          <Table fz="sm" verticalSpacing={4}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th />
                {players.map((p) => (
                  <Table.Th key={p.email} ta="right">
                    {displayName(p.email)}
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {scoring.tracks.map((t) => (
                <Table.Tr
                  key={t.commodity}
                  className="merger-row"
                  style={delay()}
                >
                  <Table.Td style={{ whiteSpace: "nowrap" }}>
                    <span
                      className={classes.level}
                      style={{
                        background: COMMODITY_INFO[t.commodity].colour,
                        color: COMMODITY_INFO[t.commodity].ink,
                      }}
                    >
                      {COMMODITY_INFO[t.commodity].emblem}{" "}
                      {commodityName(t.commodity)}
                    </span>
                  </Table.Td>
                  {players.map((p) => {
                    const r = t.rows.find((x) => x.email === p.email);
                    if (!r) return <Table.Td key={p.email} />;
                    const gain = r.award + r.bonus;
                    return (
                      <Table.Td
                        key={p.email}
                        ta="right"
                        style={{ whiteSpace: "nowrap" }}
                      >
                        <Text component="span" size="xs" c="dimmed">
                          lvl {r.level}{" "}
                        </Text>
                        <Text
                          component="span"
                          fw={gain ? 700 : 400}
                          c={gain ? "green.4" : "dimmed"}
                        >
                          +{gain}
                        </Text>
                        {r.bonus ? (
                          <Text component="span" size="xs" c="yellow.4">
                            {" "}
                            ({r.award}+{r.bonus})
                          </Text>
                        ) : null}
                      </Table.Td>
                    );
                  })}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </div>
      <div>
        <Title order={5}>Florins</Title>
        <Table fz="sm" verticalSpacing={4}>
          <Table.Tbody>
            {[...scoring.totals]
              .sort((a, b) => b.after - a.after)
              .map((t) => (
                <Table.Tr key={t.email} className="merger-row" style={delay()}>
                  <Table.Td>
                    {displayName(t.email)}
                    {you(t.email)}
                  </Table.Td>
                  <Table.Td ta="right">{t.before}</Table.Td>
                  <Table.Td ta="right" c="green.4" fw={700}>
                    +{t.after - t.before}
                  </Table.Td>
                  <Table.Td ta="right" fw={700}>
                    {t.after}
                  </Table.Td>
                </Table.Tr>
              ))}
          </Table.Tbody>
        </Table>
      </div>
    </Stack>
  );
}

/** The ledger as a sheet over the table at the end of a day. */
export default function DayLedger({
  opened,
  onClose,
  scoring,
  gameState,
  me,
}: {
  opened: boolean;
  onClose: () => void;
  scoring: DayScoring | undefined;
  gameState: MediciGameState;
  me?: string | null;
}) {
  if (!scoring) return null;
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text fw={800} size="lg">
          Day {scoring.day} is scored
          {scoring.day < 3 ? `: day ${scoring.day + 1} begins` : ""}
        </Text>
      }
      size="lg"
      centered
      overlayProps={{ backgroundOpacity: 0.6, blur: 3 }}
    >
      <Ledger scoring={scoring} gameState={gameState} me={me} />
    </Modal>
  );
}
