import { Badge } from "@mantine/core";

/**
 * A "Your turn" pill pinned to the top-left on small screens, where the
 * action panel can be below the fold. Larger screens see the panel.
 */
export default function TurnBanner({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <Badge
      hiddenFrom="md"
      color="yellow"
      variant="filled"
      radius="sm"
      size="lg"
      className="turn-banner"
      style={{
        position: "fixed",
        top: 14,
        left: 12,
        zIndex: 900,
        pointerEvents: "none",
      }}
      data-testid="turn-banner"
    >
      Your turn
    </Badge>
  );
}
