/**
 * A wooden board surface for the SVG boards: a base colour, a grain drawn
 * with turbulence noise, and a vignette so the edges fall away. Render it
 * as the first child of the SVG, before the lines and pieces.
 */
export default function BoardSurface({
  id,
  box,
  radius = 18,
}: {
  /** Unique per SVG on the page, since filter ids are global. */
  id: string;
  box: { minX: number; minY: number; width: number; height: number };
  radius?: number;
}) {
  const grain = `${id}-grain`;
  const vignette = `${id}-vignette`;
  const rect = {
    x: box.minX,
    y: box.minY,
    width: box.width,
    height: box.height,
    rx: radius,
  };
  return (
    <g aria-hidden="true">
      <defs>
        <filter id={grain} x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.015 0.5"
            numOctaves="3"
            seed="11"
            result="noise"
          />
          {/* Keep only a soft alpha from the noise, tinted a lighter wood. */}
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 0.78  0 0 0 0 0.60  0 0 0 0 0.38  0.55 0 0 0 -0.08"
          />
        </filter>
        <radialGradient id={vignette} cx="50%" cy="45%" r="72%">
          <stop offset="0%" stopColor="#000" stopOpacity="0" />
          <stop offset="70%" stopColor="#000" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.5" />
        </radialGradient>
      </defs>
      <rect {...rect} fill="#5c3d22" />
      <rect {...rect} filter={`url(#${grain})`} opacity="0.55" />
      <rect {...rect} fill={`url(#${vignette})`} />
      <rect
        {...rect}
        fill="none"
        stroke="rgba(0, 0, 0, 0.45)"
        strokeWidth="2"
      />
    </g>
  );
}
