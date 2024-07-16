export default function CardBack({ cardsLeft }: { cardsLeft: number }) {
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

      {/* <!-- Ornate corner decorations --> */}
      <g fill="none" stroke="#B4A166" strokeWidth="2">
        <path d="M15,15 Q30,30 15,45 Q30,60 15,75 Q30,90 15,105 Q30,120 15,135 Q30,150 15,165 Q30,180 15,195 Q30,210 15,225 Q30,240 15,255 Q30,270 15,285" />
        <path d="M185,15 Q170,30 185,45 Q170,60 185,75 Q170,90 185,105 Q170,120 185,135 Q170,150 185,165 Q170,180 185,195 Q170,210 185,225 Q170,240 185,255 Q170,270 185,285" />
        <path
          d="M15,15 Q30,30 45,15 Q60,30 75,15 Q90,30 105,15 Q120,30 135,15 Q150,30 165,15 Q180,30 195,15 Q210,30 225,15"
          transform="rotate(90 100 100)"
        />
        <path d="M15,285 Q30,270 15,255 Q30,240 15,225 Q30,210 15,195 Q30,180 15,165 Q30,150 15,135 Q30,120 15,105 Q30,90 15,75 Q30,60 15,45 Q30,30 15,15" />
      </g>
      {/* <!-- Central pattern - top and bottom sections --> */}
      <g fill="#B4A166">
        <path d="M100,50 Q90,70 100,90 Q110,70 100,50" />
        <path d="M100,210 Q90,230 100,250 Q110,230 100,210" />
        <path d="M50,150 Q70,140 90,150 Q70,160 50,150" />
        <path d="M150,150 Q130,140 110,150 Q130,160 150,150" />
      </g>

      {/* <!-- Central rosette outline --> */}
      <circle
        cx="100"
        cy="150"
        r="20"
        fill="none"
        stroke="#B4A166"
        strokeWidth="3"
      />

      {/* <!-- Ornate lines around oval --> */}
      <path
        d="M40,150 Q60,170 80,150 T120,150 T160,150"
        fill="none"
        stroke="#B4A166"
        strokeWidth="2"
      />
      <path
        d="M100,50 Q120,100 100,150 Q80,100 100,50"
        fill="none"
        stroke="#B4A166"
        strokeWidth="2"
      />

      {/* <!-- Fill the oval with decorative pattern --> */}
      <g fill="none" stroke="#B4A166" strokeWidth="1">
        <path d="M70,80 Q90,100 70,120 T70,160 T70,200" />
        <path d="M130,80 Q110,100 130,120 T130,160 T130,200" />
        <path
          d="M80,70 Q100,90 120,70 T160,70 T200,70"
          transform="rotate(90 100 100)"
        />
      </g>

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
        {cardsLeft}
      </text>

      <text
        x="100"
        y="30"
        fontSize="24"
        fill="#B4A166"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        Deck
      </text>
    </svg>
  );
}
