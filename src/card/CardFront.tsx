export default function CardFront({
  card,
  size = "lg",
}: {
  card: string;
  size: "sm" | "lg";
}) {
  const width = size === "sm" ? "40px" : "200px";

  return (
    <span>
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
            fill={!["2x", "1/2"].includes(card) ? "#D9B44A" : "#3B5752"}
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
            stroke={!["2x", "1/2"].includes(card) ? "#6B4226" : "#B4A166"}
            strokeWidth="10"
            rx="10"
            ry="10"
          />

          {/* <!-- Central oval outline --> */}
          {/* {size === "lg" && (
            <ellipse
              cx="100"
              cy="150"
              rx="60"
              ry="100"
              fill="none"
              stroke={!["2x", "1/2"].includes(card) ? "#6B4226" : "#B4A166"}
              strokeWidth="5"
            />
          )} */}

          {/* <!-- Dynamic number placeholder --> */}
          <text
            x="50%"
            y="50%"
            fontSize={size === "sm" ? "140" : "48"}
            fill={!["2x", "1/2"].includes(card) ? "#6B4226" : "#B4A166"}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {card}
          </text>

          {size === "lg" && (
            <text
              x="100"
              y="30"
              fontSize="24"
              fill={!["2x", "1/2"].includes(card) ? "#6B4226" : "#B4A166"}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              Revealed
            </text>
          )}
        </svg>
      </div>
    </span>
  );
}
