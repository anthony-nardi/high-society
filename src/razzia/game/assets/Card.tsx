export default function Card({
  children,
  fill = "#000000",
  transform = "",
}: {
  children: React.ReactNode;
  fill?: string;
  transform?: string;
}) {
  const defaultWidth = 175;
  const defaultHeight = 250;
  const scaleMult = 0.8;

  return (
    <svg
      width={`${defaultWidth * scaleMult}`}
      height={`${defaultHeight * scaleMult}`}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 350 500"
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
