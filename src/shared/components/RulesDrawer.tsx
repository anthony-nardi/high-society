import { Button, Drawer, Group } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { useState, type ReactNode } from "react";

const WIDE_KEY = "rules:fullscreen";

function readWide() {
  try {
    return window.localStorage.getItem(WIDE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * A "How to play" button pinned to the top-right corner that opens and
 * closes the rules. On a desktop the open drawer can be widened to the
 * whole screen, and that choice is remembered. The drawer has no close
 * cross of its own, since that would sit under these buttons.
 */
export default function RulesDrawer({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [opened, { toggle, close }] = useDisclosure(false);
  const [wide, setWide] = useState(readWide);
  // Below this the drawer already fills the screen, so the toggle is noise.
  const desktop = useMediaQuery("(min-width: 62em)");
  const fullScreen = wide && desktop;

  const toggleWide = () => {
    const next = !wide;
    setWide(next);
    try {
      window.localStorage.setItem(WIDE_KEY, next ? "1" : "0");
    } catch {
      // Private mode or blocked storage: the choice still holds for this page.
    }
  };

  return (
    <>
      <Group
        gap={6}
        wrap="nowrap"
        style={{ position: "fixed", top: 12, right: 12, zIndex: 1100 }}
      >
        {opened && desktop && (
          <Button
            variant="default"
            size="xs"
            onClick={toggleWide}
            aria-pressed={fullScreen}
            title={fullScreen ? "Back to a side panel" : "Fill the screen"}
          >
            {fullScreen ? "Side panel" : "Full screen"}
          </Button>
        )}
        <Button
          variant={opened ? "filled" : "subtle"}
          size="xs"
          onClick={toggle}
          aria-expanded={opened}
        >
          {opened ? "Close" : "How to play"}
        </Button>
      </Group>
      <Drawer
        opened={opened}
        onClose={close}
        title={title}
        position="right"
        size={fullScreen ? "100%" : "md"}
        withCloseButton={false}
        zIndex={1000}
        styles={
          fullScreen
            ? {
                // A readable column in the middle of the wide drawer.
                body: { maxWidth: 880, margin: "0 auto", fontSize: "1.05rem" },
                title: { maxWidth: 880, margin: "0 auto", width: "100%" },
                header: { justifyContent: "center" },
              }
            : undefined
        }
      >
        {children}
      </Drawer>
    </>
  );
}
