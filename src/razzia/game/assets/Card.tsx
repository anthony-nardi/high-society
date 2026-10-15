/** Loot card frame. Scales with its container: wrap it in a div with a width. */
export default function Card({
  children,
  fill = "#000000",
  transform = "",
}: {
  children: React.ReactNode;
  fill?: string;
  transform?: string;
}) {
  return (
    <svg
      width="100%"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 290 440"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block" }}
    >
      <rect
        x="5"
        y="5"
        width="280"
        height="430"
        rx="20"
        ry="20"
        fill={fill}
        stroke="#000"
        strokeWidth="5"
      />
      <g transform={transform}>{children}</g>
    </svg>
  );
}
