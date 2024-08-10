const CHIP_COLOR = "#FF0000"; // Red color for the chip
const TEXT_COLOR = "#FFFFFF"; // White color for the text

interface PokerChipProps {
  number: number;
}

export default function PokerChip({ number }: PokerChipProps) {
  console.log(
    `Number: ${number}, Chip Color: ${CHIP_COLOR}, Text Color: ${TEXT_COLOR}`
  );
  return (
    <svg width="200" height="200" viewBox="0 0 200 200">
      {/* Outer circle */}
      <circle
        cx="100"
        cy="100"
        r="90"
        fill={CHIP_COLOR}
        stroke="#000"
        strokeWidth="10"
      />

      {/* Inner circle */}
      <circle
        cx="100"
        cy="100"
        r="60"
        fill="#FFFFFF"
        stroke="#000000"
        strokeWidth="5"
      />

      {/* Text in the center */}
      <text
        x="100"
        y="100"
        fontSize="36"
        fill={"#000"}
        textAnchor="middle"
        dominantBaseline="middle"
        dy=".1em"
      >
        {number}
      </text>
    </svg>
  );
}
