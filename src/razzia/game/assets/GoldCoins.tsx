import Card from "./Card";

/** Three stacked gold coins on a yellow card, matching the rulebook's gold suit. */
export default function GoldCoins() {
  return (
    <Card fill="#c9a227" transform="translate(45,110) scale(1)">
      <svg
        width="200"
        height="220"
        viewBox="0 0 200 220"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="goldCoinFace" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffe680" />
            <stop offset="100%" stopColor="#d4a017" />
          </linearGradient>
        </defs>
        {[
          { cx: 70, cy: 150 },
          { cx: 130, cy: 150 },
          { cx: 100, cy: 100 },
        ].map((coin, index) => (
          <g key={index}>
            <ellipse
              cx={coin.cx}
              cy={coin.cy + 10}
              rx="48"
              ry="20"
              fill="#8a6a0b"
            />
            <ellipse
              cx={coin.cx}
              cy={coin.cy}
              rx="48"
              ry="20"
              fill="url(#goldCoinFace)"
              stroke="#6b4e00"
              strokeWidth="3"
            />
            <ellipse
              cx={coin.cx}
              cy={coin.cy}
              rx="30"
              ry="11"
              fill="none"
              stroke="#6b4e00"
              strokeWidth="2"
              opacity="0.7"
            />
            <text
              x={coin.cx}
              y={coin.cy + 5}
              textAnchor="middle"
              fontSize="16"
              fontWeight="700"
              fill="#6b4e00"
              fontFamily="Georgia, serif"
            >
              $
            </text>
          </g>
        ))}
      </svg>
    </Card>
  );
}
