import { Button, Drawer } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type { ReactNode } from "react";

/**
 * A "How to play" button pinned to the top-right corner that opens and
 * closes the rules. The drawer has no close cross of its own, since that
 * would sit under this button.
 */
export default function RulesDrawer({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [opened, { toggle, close }] = useDisclosure(false);

  return (
    <>
      <Button
        variant={opened ? "filled" : "subtle"}
        size="xs"
        onClick={toggle}
        aria-expanded={opened}
        style={{ position: "fixed", top: 12, right: 12, zIndex: 1100 }}
      >
        {opened ? "Close" : "How to play"}
      </Button>
      <Drawer
        opened={opened}
        onClose={close}
        title={title}
        position="right"
        size="md"
        withCloseButton={false}
        zIndex={1000}
      >
        {children}
      </Drawer>
    </>
  );
}
