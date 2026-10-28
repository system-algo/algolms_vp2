import React from 'react';

/**
 * High-quality vector SVG sprites for "Laser and Plants" game
 * Matching the exact Algo LMS production visuals.
 */
export default function PlantSprite({
  type = 'bush',
  stage = 1,
  size = 46,
  isWatered = false,
  isEvil = false,
  destroyed = false,
}) {
  const actualType = isEvil ? 'pest' : type;

  // 1. Harmful Plant: Venus Flytrap / Piranha Plant
  if (actualType === 'pest') {
    return (
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        style={{
          overflow: 'visible',
          transition: 'transform 0.3s ease, opacity 0.3s ease',
          transform: destroyed ? 'scale(0) rotate(45deg)' : 'scale(1)',
          opacity: destroyed ? 0 : 1,
          filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.4))',
        }}
      >
        {/* Base soil clump / roots */}
        <ellipse cx="32" cy="56" rx="14" ry="4" fill="#3b1419" />

        {/* Stem & Lower teal leaves */}
        <path d="M 32 54 Q 32 44 32 38" stroke="#1f4f5a" strokeWidth="5" strokeLinecap="round" />
        <path
          d="M 30 52 C 20 52 14 46 16 40 C 22 42 27 46 30 50 Z"
          fill="#27616f"
          stroke="#133740"
          strokeWidth="1.5"
        />
        <path
          d="M 34 52 C 44 52 50 46 48 40 C 42 42 37 46 34 50 Z"
          fill="#27616f"
          stroke="#133740"
          strokeWidth="1.5"
        />

        {/* Upper Leaf Collar */}
        <path
          d="M 24 38 C 16 32 18 24 26 26 C 26 31 25 35 24 38 Z"
          fill="#31788a"
          stroke="#133740"
          strokeWidth="1.5"
        />
        <path
          d="M 40 38 C 48 32 46 24 38 26 C 38 31 39 35 40 38 Z"
          fill="#31788a"
          stroke="#133740"
          strokeWidth="1.5"
        />

        {/* Venus Flytrap Mouth Interior (Red/Purple cavity) */}
        <ellipse cx="32" cy="22" rx="18" ry="14" fill="#841e2d" stroke="#50121a" strokeWidth="2" />
        <ellipse cx="32" cy="22" rx="14" ry="10" fill="#59131d" />

        {/* White sharp jagged teeth */}
        {/* Top teeth */}
        <polygon points="18,17 22,23 23,17" fill="#ffffff" />
        <polygon points="24,15 28,24 29,15" fill="#ffffff" />
        <polygon points="31,14 34,25 36,14" fill="#ffffff" />
        <polygon points="38,15 41,24 43,15" fill="#ffffff" />
        <polygon points="44,17 47,23 48,17" fill="#ffffff" />

        {/* Bottom teeth */}
        <polygon points="21,27 24,20 26,27" fill="#ffffff" />
        <polygon points="28,28 31,19 33,28" fill="#ffffff" />
        <polygon points="35,28 38,19 40,28" fill="#ffffff" />
        <polygon points="42,27 45,21 47,27" fill="#ffffff" />

        {/* Outer green mouth lips */}
        <path
          d="M 14 22 C 14 10 50 10 50 22 C 46 13 18 13 14 22 Z"
          fill="#27616f"
          stroke="#133740"
          strokeWidth="1.5"
        />
        <path
          d="M 14 22 C 14 34 50 34 50 22 C 46 31 18 31 14 22 Z"
          fill="#27616f"
          stroke="#133740"
          strokeWidth="1.5"
        />

        {/* Sinister Red/Yellow eye dots */}
        <circle cx="25" cy="11" r="2.5" fill="#facc15" stroke="#b45309" strokeWidth="0.8" />
        <circle cx="25" cy="11" r="1.2" fill="#dc2626" />
        <circle cx="39" cy="11" r="2.5" fill="#facc15" stroke="#b45309" strokeWidth="0.8" />
        <circle cx="39" cy="11" r="1.2" fill="#dc2626" />
      </svg>
    );
  }

  // 2. Sprout (Seedling stages 1, 2, 3, or Watered Adult Stage 4)
  if (actualType === 'sprout') {
    if (isWatered || stage === 4) {
      // Stage 4: Lush Tomato/Berry Bush (Watered)
      return (
        <svg
          viewBox="0 0 64 64"
          width={size}
          height={size}
          style={{ overflow: 'visible', filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.35))' }}
        >
          <ellipse cx="32" cy="56" rx="14" ry="4" fill="#3b1419" />
          {/* Stem */}
          <path d="M 32 54 L 32 40" stroke="#1f4f5a" strokeWidth="4" strokeLinecap="round" />
          {/* Lush Teal Leaf Clusters */}
          <circle cx="22" cy="36" r="12" fill="#296979" stroke="#133740" strokeWidth="1.5" />
          <circle cx="42" cy="36" r="12" fill="#296979" stroke="#133740" strokeWidth="1.5" />
          <circle cx="32" cy="24" r="13" fill="#337c8e" stroke="#133740" strokeWidth="1.5" />

          {/* 3 Bright Ripe Red Tomatoes / Berries */}
          <circle cx="22" cy="28" r="7.5" fill="#ef4444" stroke="#991b1b" strokeWidth="1.5" />
          <ellipse cx="20" cy="26" rx="2" ry="1.2" fill="#fca5a5" />
          {/* Calyx (green crown) */}
          <polygon points="22,21 20,23 24,23" fill="#15803d" />

          <circle cx="42" cy="28" r="7.5" fill="#ef4444" stroke="#991b1b" strokeWidth="1.5" />
          <ellipse cx="40" cy="26" rx="2" ry="1.2" fill="#fca5a5" />
          <polygon points="42,21 40,23 44,23" fill="#15803d" />

          <circle cx="32" cy="37" r="8" fill="#dc2626" stroke="#991b1b" strokeWidth="1.5" />
          <ellipse cx="30" cy="35" rx="2.5" ry="1.5" fill="#fca5a5" />
          <polygon points="32,30 30,32 34,32" fill="#15803d" />
        </svg>
      );
    }

    if (stage === 1) {
      // Stage 1: Delicate seedling with 2 small round cotyledons
      return (
        <svg
          viewBox="0 0 64 64"
          width={size}
          height={size}
          style={{ overflow: 'visible', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))' }}
        >
          <ellipse cx="32" cy="56" rx="10" ry="3.5" fill="#3b1419" />
          <path d="M 32 54 Q 31 46 32 40" stroke="#34d399" strokeWidth="3" strokeLinecap="round" />
          {/* Left leaf */}
          <path
            d="M 31 42 C 22 41 18 35 22 32 C 27 32 30 37 31 42 Z"
            fill="#4ade80"
            stroke="#15803d"
            strokeWidth="1.2"
          />
          {/* Right leaf */}
          <path
            d="M 33 42 C 42 41 46 35 42 32 C 37 32 34 37 33 42 Z"
            fill="#4ade80"
            stroke="#15803d"
            strokeWidth="1.2"
          />
        </svg>
      );
    }

    if (stage === 2) {
      // Stage 2: Young growing sprout with 3 serrated leaves
      return (
        <svg
          viewBox="0 0 64 64"
          width={size}
          height={size}
          style={{ overflow: 'visible', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))' }}
        >
          <ellipse cx="32" cy="56" rx="12" ry="4" fill="#3b1419" />
          <path d="M 32 54 L 32 34" stroke="#22c55e" strokeWidth="3.5" strokeLinecap="round" />
          {/* Left leaf */}
          <path
            d="M 31 44 C 18 43 14 36 20 31 C 26 31 30 38 31 44 Z"
            fill="#34d399"
            stroke="#15803d"
            strokeWidth="1.2"
          />
          {/* Right leaf */}
          <path
            d="M 33 40 C 46 39 50 32 44 27 C 38 27 34 34 33 40 Z"
            fill="#34d399"
            stroke="#15803d"
            strokeWidth="1.2"
          />
          {/* Top leaf */}
          <path
            d="M 32 35 C 27 24 37 24 32 35 Z"
            fill="#4ade80"
            stroke="#15803d"
            strokeWidth="1.2"
          />
        </svg>
      );
    }

    // Stage 3: Tall growing sprout with bud
    return (
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        style={{ overflow: 'visible', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))' }}
      >
        <ellipse cx="32" cy="56" rx="13" ry="4" fill="#3b1419" />
        <path d="M 32 54 L 32 28" stroke="#16a34a" strokeWidth="4" strokeLinecap="round" />
        {/* Side leaves */}
        <circle cx="21" cy="40" r="7" fill="#22c55e" stroke="#15803d" strokeWidth="1.2" />
        <circle cx="43" cy="38" r="7.5" fill="#22c55e" stroke="#15803d" strokeWidth="1.2" />
        <circle cx="23" cy="27" r="7" fill="#34d399" stroke="#15803d" strokeWidth="1.2" />
        {/* Flower bud head */}
        <circle cx="32" cy="22" r="5" fill="#f43f5e" stroke="#be123c" strokeWidth="1.2" />
      </svg>
    );
  }

  // 3. Striped Round Fruit (Melon / Striped Gourd)
  if (actualType === 'melon') {
    return (
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        style={{ overflow: 'visible', filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.35))' }}
      >
        <ellipse cx="32" cy="56" rx="14" ry="4" fill="#3b1419" />
        {/* Background teal leaves */}
        <circle cx="20" cy="36" r="10" fill="#27616f" stroke="#133740" strokeWidth="1.5" />
        <circle cx="44" cy="36" r="10" fill="#27616f" stroke="#133740" strokeWidth="1.5" />
        <circle cx="32" cy="22" r="11" fill="#31788a" stroke="#133740" strokeWidth="1.5" />

        {/* Striped round fruit */}
        <g transform="translate(32,36)">
          <circle cx="0" cy="0" r="12" fill="#0284c7" stroke="#0369a1" strokeWidth="1.5" />
          {/* Orange/Yellow curved stripes */}
          <path d="M -9 -8 C -4 0 -4 0 -9 8" stroke="#f97316" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M -3 -11 C 0 0 0 0 -3 11" stroke="#f97316" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M 4 -11 C 7 0 7 0 4 11" stroke="#f97316" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      </svg>
    );
  }

  // 4. Flowering Shrub (Pink / Peach Blossom)
  if (actualType === 'flower') {
    return (
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        style={{ overflow: 'visible', filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.35))' }}
      >
        <ellipse cx="32" cy="56" rx="14" ry="4" fill="#3b1419" />
        <path d="M 32 54 L 32 38" stroke="#1f4f5a" strokeWidth="4" strokeLinecap="round" />
        {/* Teal foliage */}
        <circle cx="21" cy="36" r="11" fill="#27616f" stroke="#133740" strokeWidth="1.5" />
        <circle cx="43" cy="36" r="11" fill="#27616f" stroke="#133740" strokeWidth="1.5" />
        <circle cx="32" cy="25" r="11" fill="#31788a" stroke="#133740" strokeWidth="1.5" />

        {/* Pink/Coral Blossom */}
        <g transform="translate(32, 22)">
          <circle cx="-5" cy="-3" r="4.5" fill="#fb7185" />
          <circle cx="5" cy="-3" r="4.5" fill="#fb7185" />
          <circle cx="0" cy="5" r="4.5" fill="#fb7185" />
          <circle cx="-4" cy="3" r="4.5" fill="#f43f5e" />
          <circle cx="4" cy="3" r="4.5" fill="#f43f5e" />
          <circle cx="0" cy="0" r="3.5" fill="#fde047" stroke="#ca8a04" strokeWidth="0.8" />
        </g>
      </svg>
    );
  }

  // 5. Default Adult Bush with Bright Red Tomatoes/Berries
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      style={{ overflow: 'visible', filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.35))' }}
    >
      <ellipse cx="32" cy="56" rx="14" ry="4" fill="#3b1419" />
      <path d="M 32 54 L 32 40" stroke="#1f4f5a" strokeWidth="4" strokeLinecap="round" />

      {/* Lush Foliage */}
      <circle cx="22" cy="36" r="12" fill="#27616f" stroke="#133740" strokeWidth="1.5" />
      <circle cx="42" cy="36" r="12" fill="#27616f" stroke="#133740" strokeWidth="1.5" />
      <circle cx="32" cy="24" r="13" fill="#31788a" stroke="#133740" strokeWidth="1.5" />

      {/* Red Tomatoes / Berries */}
      <circle cx="22" cy="28" r="7.5" fill="#ef4444" stroke="#991b1b" strokeWidth="1.5" />
      <ellipse cx="20" cy="26" rx="2" ry="1.2" fill="#fca5a5" />
      <polygon points="22,21 20,23 24,23" fill="#15803d" />

      <circle cx="42" cy="28" r="7.5" fill="#ef4444" stroke="#991b1b" strokeWidth="1.5" />
      <ellipse cx="40" cy="26" rx="2" ry="1.2" fill="#fca5a5" />
      <polygon points="42,21 40,23 44,23" fill="#15803d" />

      <circle cx="32" cy="37" r="8" fill="#dc2626" stroke="#991b1b" strokeWidth="1.5" />
      <ellipse cx="30" cy="35" rx="2.5" ry="1.5" fill="#fca5a5" />
      <polygon points="32,30 30,32 34,32" fill="#15803d" />
    </svg>
  );
}
