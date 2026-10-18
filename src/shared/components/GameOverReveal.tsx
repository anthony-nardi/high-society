import type { ReactNode } from "react";
import Fireworks from "./Fireworks";

/**
 * Wraps a game-over screen so it rises into view instead of snapping in.
 * Give the headline the `reveal-title` class to let it land a beat later.
 * With `celebrate`, fireworks go up over the screen for a few seconds and
 * then clear themselves.
 */
export default function GameOverReveal({
  children,
  celebrate = false,
}: {
  children: ReactNode;
  /** True when the person looking at the screen won. */
  celebrate?: boolean;
}) {
  return (
    <div className="reveal">
      {celebrate && <Fireworks />}
      {children}
    </div>
  );
}
