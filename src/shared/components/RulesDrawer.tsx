import { Button, Drawer } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type { ReactNode } from "react";

/** A "How to play" button pinned to the top-right corner, opening the rules. */
export default function RulesDrawer({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <>
      <Button
        variant="subtle"
        size="xs"
        onClick={open}
        style={{ position: "fixed", top: 12, right: 12, zIndex: 300 }}
      >
        How to play
      </Button>
      <Drawer
        opened={opened}
        onClose={close}
        title={title}
        position="right"
        size="md"
      >
        {children}
      </Drawer>
    </>
  );
}
