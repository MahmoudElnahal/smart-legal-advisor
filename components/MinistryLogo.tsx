import React from 'react';

interface MinistryLogoProps {
  className?: string;
  size?: number;
  withGlow?: boolean;
}

export const MinistryLogo: React.FC<MinistryLogoProps> = ({ 
  className = "w-14 h-14", 
  size = 120,
  withGlow = false 
}) => {
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      {withGlow && (
        <div className="absolute inset-0 rounded-full bg-[#C5A059]/30 blur-md animate-pulse" />
      )}
      <svg 
        viewBox="0 0 400 400" 
        width="100%" 
        height="100%" 
        className="relative drop-shadow-md select-none"
        aria-label="شعار وزارة العمل - جمهورية مصر العربية"
      >
        <defs>
          {/* Outer Gold Gradient */}
          <linearGradient id="goldBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F9E29D" />
            <stop offset="25%" stopColor="#D4AF37" />
            <stop offset="50%" stopColor="#AA7A1E" />
            <stop offset="75%" stopColor="#E5C158" />
            <stop offset="100%" stopColor="#8C5C15" />
          </linearGradient>

          {/* Inner Disc Background */}
          <radialGradient id="discGrad" cx="50%" cy="45%" r="50%">
            <stop offset="0%" stopColor="#6E3F15" />
            <stop offset="60%" stopColor="#4A260B" />
            <stop offset="100%" stopColor="#2E1404" />
          </radialGradient>

          {/* Eagle Gold Gradient */}
          <linearGradient id="eagleGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF2B2" />
            <stop offset="30%" stopColor="#E5BE53" />
            <stop offset="70%" stopColor="#B8860B" />
            <stop offset="100%" stopColor="#8B6508" />
          </linearGradient>

          {/* Shield Metallic Gradient */}
          <linearGradient id="shieldSheen" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#C8102E" />
            <stop offset="100%" stopColor="#9B0018" />
          </linearGradient>

          {/* Text Paths */}
          {/* Top Arc for Arabic: وزارة العمل */}
          <path 
            id="topTextPath" 
            d="M 60,200 A 140,140 0 0,1 340,200" 
            fill="none" 
          />
          {/* Bottom Arc for English: Ministry Of Labour */}
          <path 
            id="bottomTextPath" 
            d="M 65,200 A 135,135 0 0,0 335,200" 
            fill="none" 
          />
        </defs>

        {/* Outer Gold Rim */}
        <circle cx="200" cy="200" r="192" fill="url(#goldBorderGrad)" stroke="#5A340E" strokeWidth="3" />
        <circle cx="200" cy="200" r="184" fill="none" stroke="#FFF5C2" strokeWidth="2.5" opacity="0.8" />
        <circle cx="200" cy="200" r="178" fill="none" stroke="#8C5C15" strokeWidth="2" />

        {/* Main Bronze/Brown Seal Body */}
        <circle cx="200" cy="200" r="172" fill="url(#discGrad)" stroke="#E5BE53" strokeWidth="3" />

        {/* Inner Decorative Ring Framing Center */}
        <circle cx="200" cy="200" r="116" fill="none" stroke="url(#goldBorderGrad)" strokeWidth="4" />
        <circle cx="200" cy="200" r="111" fill="none" stroke="#2A1102" strokeWidth="1.5" />
        <circle cx="200" cy="200" r="109" fill="none" stroke="#FFEAA7" strokeWidth="1" opacity="0.5" />

        {/* Arabic Curved Title: وزارة العمل */}
        <text fill="#FFE899" fontSize="35" fontWeight="900" fontFamily="Cairo, Arial, sans-serif" letterSpacing="4">
          <textPath href="#topTextPath" startOffset="50%" textAnchor="middle">
            وزارة الـعـمـل
          </textPath>
        </text>

        {/* Decorative Side Stars */}
        <g fill="#FBD368" stroke="#8C5C15" strokeWidth="1">
          {/* Left Star */}
          <polygon points="52,200 56,190 67,190 58,197 61,207 52,201 43,207 46,197 37,190 48,190" transform="scale(0.8) translate(15, 45)" />
          {/* Right Star */}
          <polygon points="52,200 56,190 67,190 58,197 61,207 52,201 43,207 46,197 37,190 48,190" transform="scale(0.8) translate(395, 45)" />
        </g>

        {/* English Curved Title: Ministry Of Labour */}
        <text fill="#FFE899" fontSize="21" fontWeight="800" fontFamily="Arial, sans-serif" letterSpacing="5">
          <textPath href="#bottomTextPath" startOffset="50%" textAnchor="middle">
            MINISTRY OF LABOUR
          </textPath>
        </text>

        {/* Center: Eagle of Saladin (نسر صلاح الدين) */}
        <g id="eagle" transform="translate(130, 115) scale(0.7)">
          {/* Wings Left and Right */}
          {/* Left Wing Feathers */}
          <path 
            d="M 100,50 C 70,30 35,40 10,80 C 20,95 30,105 45,115 C 30,125 15,140 5,160 C 25,165 45,165 65,160 C 50,175 35,195 25,220 C 50,215 75,205 95,190 L 95,120 Z" 
            fill="url(#eagleGold)" 
            stroke="#68420B" 
            strokeWidth="2" 
          />
          {/* Right Wing Feathers */}
          <path 
            d="M 100,50 C 130,30 165,40 190,80 C 180,95 170,105 155,115 C 170,125 185,140 195,160 C 175,165 155,165 135,160 C 150,175 165,195 175,220 C 150,215 125,205 105,190 L 105,120 Z" 
            fill="url(#eagleGold)" 
            stroke="#68420B" 
            strokeWidth="2" 
          />

          {/* Wing Feather Internal Texture Details */}
          <path d="M 30,95 L 85,125 M 25,150 L 90,145 M 40,190 L 92,175" stroke="#7A4E0B" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 170,95 L 115,125 M 175,150 L 110,145 M 160,190 L 108,175" stroke="#7A4E0B" strokeWidth="2.5" strokeLinecap="round" />

          {/* Eagle Neck and Head (Turned to viewer's right / heraldic left) */}
          <path 
            d="M 88,60 C 88,35 95,15 110,15 C 120,15 125,22 135,25 C 130,32 122,35 120,42 C 125,48 118,55 114,60 Z" 
            fill="url(#eagleGold)" 
            stroke="#68420B" 
            strokeWidth="2" 
          />
          {/* Beak */}
          <path d="M 125,22 L 142,27 L 126,35 Z" fill="#FFCC00" stroke="#7A4E0B" strokeWidth="1.5" />
          {/* Eye */}
          <circle cx="114" cy="25" r="2.5" fill="#1A1A1A" />

          {/* Chest Shield Body */}
          <path 
            d="M 72,75 L 128,75 C 128,75 133,125 122,150 C 112,170 100,180 100,180 C 100,180 88,170 78,150 C 67,125 72,75 72,75 Z" 
            fill="#FFFFFF" 
            stroke="#FFD700" 
            strokeWidth="3.5" 
          />

          {/* Shield Tricolor: Red, White, Black */}
          {/* Red Band */}
          <path 
            d="M 73,76 L 127,76 L 127,100 L 73,100 Z" 
            fill="url(#shieldSheen)" 
          />
          {/* White Middle Band with Miniature Golden Eagle Motif */}
          <path 
            d="M 73,100 L 127,100 L 125,130 L 75,130 Z" 
            fill="#FFFFFF" 
          />
          <path 
            d="M 96,110 L 104,110 L 100,122 Z" 
            fill="#D4AF37" 
            stroke="#996515" 
            strokeWidth="0.8" 
          />

          {/* Black Bottom Band */}
          <path 
            d="M 75,130 L 125,130 C 120,150 110,165 100,178 C 90,165 80,150 75,130 Z" 
            fill="#1A1A1A" 
          />

          {/* Eagle Legs & Talons */}
          <path d="M 80,175 L 75,200 L 70,205 M 80,200 L 80,208 M 86,200 L 90,206" stroke="#C59B27" strokeWidth="4" strokeLinecap="round" />
          <path d="M 120,175 L 125,200 L 130,205 M 120,200 L 120,208 M 114,200 L 110,206" stroke="#C59B27" strokeWidth="4" strokeLinecap="round" />

          {/* Banner / Scroll: جمهورية مصر العربية */}
          <g transform="translate(10, 195)">
            <path 
              d="M 35,15 Q 100,0 145,15 Q 165,17 155,30 Q 100,12 45,30 Q 25,17 35,15 Z" 
              fill="#F9E29D" 
              stroke="#8C5C15" 
              strokeWidth="2" 
            />
            {/* Banner fold ends */}
            <path d="M 25,23 L 38,15 L 36,30 Z" fill="#D4AF37" stroke="#8C5C15" strokeWidth="1.5" />
            <path d="M 155,23 L 142,15 L 144,30 Z" fill="#D4AF37" stroke="#8C5C15" strokeWidth="1.5" />
            
            {/* Arabic Script on Banner */}
            <text 
              x="90" 
              y="22" 
              fill="#4A260B" 
              fontSize="10" 
              fontWeight="900" 
              fontFamily="Cairo, sans-serif" 
              textAnchor="middle"
            >
              جمهورية مصر العربية
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
};
