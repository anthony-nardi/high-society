function getRainbowColor(number: number): string {
  const clampedNumber = Math.max(3, Math.min(35, number));
  const hue = 210 - ((clampedNumber - 3) / (35 - 3)) * 210;
  return `hsl(${hue}, 100%, 50%)`;
}

export default function CardFront({
  card,
  size = "lg",
}: {
  card: number;
  size: "sm" | "lg";
}) {
  const width = size === "sm" ? "40px" : "200px";
  const CARD_BACKGROUND_COLOR = getRainbowColor(card);
  const TEXT_COLOR = "#000";
  const BORDER_COLOR = "#fff";

  console.log(
    `Card: ${card}, Background Color: ${CARD_BACKGROUND_COLOR}, Text Color: ${TEXT_COLOR}, Border Color: ${BORDER_COLOR}`
  );

  return (
    <div style={{ width }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 200 300"
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        height="100%"
      >
        {/* <!-- Card background --> */}
        <rect
          width="100%"
          height="100%"
          fill={CARD_BACKGROUND_COLOR}
          rx="15"
          ry="15"
        />

        {/* <!-- Border --> */}
        <rect
          x="5"
          y="5"
          width="190"
          height="290"
          fill="none"
          stroke={BORDER_COLOR}
          strokeWidth="10"
          rx="10"
          ry="10"
        />

        {/* <!-- Dynamic number placeholder --> */}
        <text
          x="50%"
          y="50%"
          fontSize={size === "sm" ? "140" : "48"}
          fill={TEXT_COLOR}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {card}
        </text>
      </svg>
    </div>
  );
}
