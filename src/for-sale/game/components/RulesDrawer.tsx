import { Group, List, Stack, Text, Title } from "@mantine/core";
import RulesDrawer from "../../../shared/components/RulesDrawer";
import PropertyCard from "./PropertyCard";
import ChequeCard from "./ChequeCard";

export default function ForSaleRules() {
  return (
    <RulesDrawer title="How to play For Sale">
      <Stack gap="md">
        <Text>
          A quick auction game by Stefan Dorra. First buy properties with your
          cash, then sell them for cheques. The richest player at the end wins.
        </Text>

        <Title order={4}>The cards</Title>
        <Group gap="xs" wrap="wrap">
          {[2, 9, 15, 20, 25, 30].map((p) => (
            <PropertyCard key={p} property={p} width={48} />
          ))}
          <ChequeCard amount={0} width={48} />
          <ChequeCard amount={9} width={48} />
          <ChequeCard amount={15} width={48} />
        </Group>
        <List>
          <List.Item>
            30 properties, numbered 1 to 30: a cardboard box up to a tower.
          </List.Item>
          <List.Item>
            30 cheques: two of each from $2,000 to $15,000, and two worthless $0
            cheques.
          </List.Item>
          <List.Item>
            Everyone starts with $14,000, or $18,000 with 3 or 4 players. With 3
            players six of each card are removed, with 4 players two.
          </List.Item>
        </List>

        <Title order={4}>Buying</Title>
        <List>
          <List.Item>
            Each round, as many properties as there are players are turned up.
          </List.Item>
          <List.Item>
            In turn, bid more than the standing bid or pass. Bids are in
            thousands and you cannot bid more cash than you have.
          </List.Item>
          <List.Item>
            When you pass you take the cheapest property still on the table and
            get half your bid back, rounded down. Passing without a bid costs
            nothing.
          </List.Item>
          <List.Item>
            The last player left takes the dearest property and pays their full
            bid. They open the next round.
          </List.Item>
        </List>

        <Title order={4}>Selling</Title>
        <List>
          <List.Item>
            Each round, as many cheques as there are players are turned up.
          </List.Item>
          <List.Item>
            Everyone picks one of their properties face down. The highest
            property takes the biggest cheque, the next the next, and so on.
          </List.Item>
        </List>

        <Title order={4}>Winning</Title>
        <List>
          <List.Item>
            Add your cheques to the cash you kept. Most wins; ties go to whoever
            kept more cash.
          </List.Item>
        </List>
      </Stack>
    </RulesDrawer>
  );
}
