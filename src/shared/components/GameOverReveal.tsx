import type { ReactNode } from "react";

/**
 * Wraps a game-over screen so it rises into view instead of snapping in.
 * Give the headline the `reveal-title` class to let it land a beat later.
 */
export default function GameOverReveal({ children }: { children: ReactNode }) {
  return <div className="reveal">{children}</div>;
}
