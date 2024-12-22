export default function Logo() {
  return (
    <div
      className="flex items-center justify-center rounded-lg"
      style={{
        width: "135px", 
        height: "80px",
        padding: "19px",
        paddingTop:"3px",
        
      }}
    >
      <svg
        viewBox="0 31 200 250" // Vue ajustée pour inclure tout le contenu
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Graduation cap */}
        <path
          d="M20 100 L100 60 L180 100 L100 140 Z"
          fill="#34495E"
          stroke="#ffffff"
          strokeWidth="4"
        />
        <path
          d="M60 115 V150 Q100 170 140 150 V115"
          fill="#34495E"
          stroke="#ffffff"
          strokeWidth="4"
        />
        <path d="M100 140 V170" stroke="#ffffff" strokeWidth="4" />
        {/* Book pages */}
        <path
          d="M70 90 Q100 70 130 90"
          fill="none"
          stroke="#ffffff"
          strokeWidth="4"
        />
        <path
          d="M70 100 Q100 80 130 100"
          fill="none"
          stroke="#ffffff"
          strokeWidth="4"
        />
        <path
          d="M70 110 Q100 90 130 110"
          fill="none"
          stroke="#ffffff"
          strokeWidth="4"
        />
        {/* Pencil */}
        <path
          d="M150 40 L160 30 L170 40 L160 140 Z"
          fill="#34495E"
          stroke="#ffffff"
          strokeWidth="2"
        />
        <path d="M160 140 L157 150 L163 150 Z" fill="#ffffff" />
        {/* Text */}
        
      </svg>
    </div>
  );
}
