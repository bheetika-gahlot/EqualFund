// GeoBg.jsx — Animated geometric background shapes
// NOZE-inspired: subtle circles, lines, floating polygons
import React from 'react';

export default function GeoBg() {
  return (
    <div className="geo-bg" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
        <defs>
          <style>{`
            @keyframes geoFloat {
              0%,100% { transform: translateY(0px) rotate(0deg); opacity: 0.6; }
              33%  { transform: translateY(-18px) rotate(4deg); opacity: 0.9; }
              66%  { transform: translateY(8px) rotate(-2deg); opacity: 0.5; }
            }
            @keyframes geoFloat2 {
              0%,100% { transform: translateY(0px) rotate(0deg); }
              50% { transform: translateY(-24px) rotate(-6deg); }
            }
            @keyframes geoSpin {
              from { transform: rotate(0deg); }
              to   { transform: rotate(360deg); }
            }
            @keyframes geoOrbit {
              from { transform: rotate(0deg) translateX(160px) rotate(0deg); }
              to   { transform: rotate(360deg) translateX(160px) rotate(-360deg); }
            }
            @keyframes geoPulse {
              0%,100% { r: 4; opacity: 0.8; }
              50% { r: 7; opacity: 0.4; }
            }
            .g1 { animation: geoFloat  9s ease-in-out infinite; transform-origin: center; }
            .g2 { animation: geoFloat2 12s ease-in-out infinite; transform-origin: center; }
            .g3 { animation: geoFloat  7s ease-in-out infinite 1.5s; transform-origin: center; }
            .g4 { animation: geoFloat2 15s ease-in-out infinite 2s; transform-origin: center; }
            .g5 { animation: geoSpin 40s linear infinite; transform-origin: center; }
            .g6 { animation: geoSpin 60s linear infinite reverse; transform-origin: center; }
            .gdot { animation: geoPulse 3s ease-in-out infinite; }
          `}</style>
        </defs>

        {/* ── Large background circles ── */}
        <circle cx="15%" cy="20%" r="280" fill="none" stroke="var(--geo-stroke)" strokeWidth="1" />
        <circle cx="15%" cy="20%" r="200" fill="none" stroke="var(--geo-stroke)" strokeWidth="0.5" />
        <circle cx="85%" cy="75%" r="320" fill="none" stroke="var(--geo-stroke)" strokeWidth="1" />
        <circle cx="85%" cy="75%" r="220" fill="none" stroke="var(--geo-stroke)" strokeWidth="0.5" />

        {/* ── Intersecting venn circles (NOZE style) ── */}
        <g style={{ transformOrigin: '50% 12%' }} className="g5">
          <circle cx="47%" cy="12%" r="180" fill="none" stroke="var(--geo-stroke)" strokeWidth="0.8" />
          <circle cx="53%" cy="12%" r="180" fill="none" stroke="var(--geo-stroke)" strokeWidth="0.8" />
        </g>

        {/* ── Floating triangle (top right) ── */}
        <g className="g1" style={{ transformOrigin: '82% 18%' }}>
          <polygon points="780,40 850,160 710,160" fill="var(--geo-fill)" stroke="var(--geo-stroke)" strokeWidth="1.5" />
        </g>

        {/* ── Floating square/diamond (bottom left) ── */}
        <g className="g2" style={{ transformOrigin: '12% 80%' }}>
          <rect x="5%" y="70%" width="120" height="120" rx="8" fill="var(--geo-fill)" stroke="var(--geo-stroke)" strokeWidth="1.5" transform="rotate(20, 120, 700)" />
        </g>

        {/* ── Hexagon (mid right) ── */}
        <g className="g3" style={{ transformOrigin: '88% 48%' }}>
          <polygon
            points="900,380 930,430 910,480 860,480 830,430 850,380"
            fill="var(--geo-fill)" stroke="var(--geo-stroke)" strokeWidth="1.5"
          />
        </g>

        {/* ── Small floating circles ── */}
        <g className="g4" style={{ transformOrigin: '25% 60%' }}>
          <circle cx="25%" cy="62%" r="60" fill="none" stroke="var(--geo-stroke)" strokeWidth="1.5" />
          <circle cx="25%" cy="62%" r="35" fill="var(--geo-fill)" stroke="var(--geo-stroke)" strokeWidth="0.8" />
        </g>

        {/* ── Orbiting dots ── */}
        <g style={{ transformOrigin: '50% 50%' }} className="g6">
          <circle cx="50%" cy="5%" r="3" fill="var(--mint)" opacity="0.25" />
        </g>

        {/* ── Grid dots (subtle) ── */}
        {[1,2,3,4,5].map(col =>
          [1,2,3].map(row => (
            <circle
              key={`${col}-${row}`}
              cx={`${col * 18}%`}
              cy={`${row * 30}%`}
              r="2"
              fill="var(--geo-stroke)"
              opacity="0.5"
              className="gdot"
              style={{ animationDelay: `${(col + row) * 0.4}s` }}
            />
          ))
        )}

        {/* ── Diagonal lines (bottom right) ── */}
        <line x1="75%" y1="85%" x2="95%" y2="65%" stroke="var(--geo-stroke)" strokeWidth="1" />
        <line x1="78%" y1="88%" x2="98%" y2="68%" stroke="var(--geo-stroke)" strokeWidth="0.5" />
        <line x1="72%" y1="82%" x2="92%" y2="62%" stroke="var(--geo-stroke)" strokeWidth="0.5" />

        {/* ── Floating pentagon (top left) ── */}
        <g className="g1" style={{ transformOrigin: '8% 35%', animationDelay: '3s' }}>
          <polygon
            points="40,300 90,260 130,300 110,360 60,360"
            fill="var(--geo-fill)" stroke="var(--geo-stroke)" strokeWidth="1.5"
          />
        </g>

        {/* ── Concentric rings (bottom center) ── */}
        <circle cx="50%" cy="98%" r="100" fill="none" stroke="var(--geo-stroke)" strokeWidth="0.8" />
        <circle cx="50%" cy="98%" r="150" fill="none" stroke="var(--geo-stroke)" strokeWidth="0.5" />
        <circle cx="50%" cy="98%" r="200" fill="none" stroke="var(--geo-stroke)" strokeWidth="0.3" />

        {/* ── Mint accent dots ── */}
        <circle cx="15%" cy="20%" r="5" fill="var(--mint)" opacity="0.35" className="gdot" />
        <circle cx="85%" cy="30%" r="4" fill="var(--mint)" opacity="0.25" className="gdot" style={{ animationDelay: '1.5s' }} />
        <circle cx="60%" cy="70%" r="3" fill="var(--mint)" opacity="0.2" className="gdot" style={{ animationDelay: '2.5s' }} />
      </svg>
    </div>
  );
}
