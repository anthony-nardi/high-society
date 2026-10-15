export type CardPlacement = {
  /** Horizontal offset from the hand's centre, in px. */
  x: number;
  /** Vertical offset in px; 0 for the outermost cards, negative (raised) towards the centre. */
  y: number;
  /** Rotation in degrees; negative tilts left, positive right. */
  rotate: number;
};

const MAX_TOTAL_SPREAD_DEG = 40;
const MAX_ANGLE_PER_CARD_DEG = 6;
const MAX_STEP_PX = 70;
const MAX_TOTAL_WIDTH_PX = 560;
const ARC_HEIGHT_FACTOR = 0.5;

/**
 * Position of card `index` out of `count` in a fanned hand: cards spread out
 * along a gentle arc that peaks in the middle, overlapping more as the hand
 * grows so it never gets wider than the screen.
 */
export function handLayout(count: number, index: number): CardPlacement {
  if (count <= 1) {
    return { x: 0, y: 0, rotate: 0 };
  }

  const centre = (count - 1) / 2;
  const offset = index - centre;

  const anglePerCard = Math.min(
    MAX_ANGLE_PER_CARD_DEG,
    MAX_TOTAL_SPREAD_DEG / (count - 1)
  );
  const step = Math.min(MAX_STEP_PX, MAX_TOTAL_WIDTH_PX / (count - 1));
  const sag = (o: number) => o * o * anglePerCard * ARC_HEIGHT_FACTOR;

  return {
    x: offset * step,
    // Outer cards rest on the baseline; the middle of the hand is lifted.
    y: sag(offset) - sag(centre),
    rotate: offset * anglePerCard,
  };
}
