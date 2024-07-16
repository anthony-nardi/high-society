export default function CardFront({ card }: { card: string }) {
  return (
    <svg width="200" height="300" xmlns="http://www.w3.org/2000/svg">
      {/* <!-- Card background --> */}
      <rect width="100%" height="100%" fill="#3B5752" rx="15" ry="15" />

      {/* <!-- Border --> */}
      <rect
        x="5"
        y="5"
        width="190"
        height="290"
        fill="none"
        stroke="#B4A166"
        strokeWidth="10"
        rx="10"
        ry="10"
      />

      {/* <!-- Central oval outline --> */}
      <ellipse
        cx="100"
        cy="150"
        rx="60"
        ry="100"
        fill="none"
        stroke="#B4A166"
        strokeWidth="5"
      />

      {/* <!-- Placeholder for dynamic number (empty space in center) --> */}
      <rect x="70" y="130" width="60" height="40" fill="#3B5752" />

      {/* <!-- Dynamic number placeholder --> */}
      <text
        x="100"
        y="155"
        fontSize="24"
        fill="#B4A166"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {card}
      </text>

      <text
        x="100"
        y="30"
        fontSize="24"
        fill="#B4A166"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        Revealed
      </text>
    </svg>
  );
}
