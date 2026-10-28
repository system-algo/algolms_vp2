import React from 'react';

/**
 * Builds the exact interlocking puzzle path for Scratch / Algo LMS blocks.
 */
export function buildBlockPath({ w, h, type = 'statement' }) {
  const r = 4;
  let p = '';

  if (type === 'hat') {
    // Top Hat (entry block)
    p += `M 0 10 C 0 4, 4 0, 10 0 L ${w - 6} 0 C ${w} 0, ${w} 4, ${w} 6 `;
    p += `L ${w} ${h - r} C ${w} ${h}, ${w} ${h}, ${w - r} ${h} `;
    p += `L 28 ${h} L 26 ${h} L 23 ${h + 4} L 17 ${h + 4} L 14 ${h} L 12 ${h} `;
    p += `L ${r} ${h} C 0 ${h}, 0 ${h}, 0 ${h - r} Z`;
    return p;
  }

  if (type === 'statement') {
    // Statement Block (e.g. move_forward, destroy, water)
    p += `M 0 ${r} C 0 0, 0 0, ${r} 0 `;
    p += `L 12 0 L 14 0 L 17 4 L 23 4 L 26 0 L 28 0 `;
    p += `L ${w - r} 0 C ${w} 0, ${w} 0, ${w} ${r} `;
    p += `L ${w} ${h - r} C ${w} ${h}, ${w} ${h}, ${w - r} ${h} `;
    p += `L 28 ${h} L 26 ${h} L 23 ${h + 4} L 17 ${h + 4} L 14 ${h} L 12 ${h} `;
    p += `L ${r} ${h} C 0 ${h}, 0 ${h}, 0 ${h - r} Z`;
    return p;
  }

  if (type === 'c_header') {
    // C-Block Header Bar (Top of repeat)
    p += `M 0 ${r} C 0 0, 0 0, ${r} 0 `;
    p += `L 12 0 L 14 0 L 17 4 L 23 4 L 26 0 L 28 0 `;
    p += `L ${w - r} 0 C ${w} 0, ${w} 0, ${w} ${r} `;
    p += `L ${w} ${h - r} C ${w} ${h}, ${w} ${h}, ${w - r} ${h} `;
    p += `L 44 ${h} L 42 ${h} L 39 ${h + 4} L 33 ${h + 4} L 30 ${h} L 28 ${h} `;
    p += `L 16 ${h} L 0 ${h} Z`;
    return p;
  }

  if (type === 'c_bottom') {
    // C-Block Bottom Bracket (Floor of repeat)
    p += `M 16 0 `;
    p += `L 28 0 L 30 0 L 33 4 L 39 4 L 42 0 L 44 0 `;
    p += `L ${w - r} 0 C ${w} 0, ${w} ${r}, ${w} ${r} `;
    p += `L ${w} ${h - r} C ${w} ${h}, ${w} ${h}, ${w - r} ${h} `;
    p += `L 28 ${h} L 26 ${h} L 23 ${h + 4} L 17 ${h + 4} L 14 ${h} L 12 ${h} `;
    p += `L ${r} ${h} C 0 ${h}, 0 ${h}, 0 ${h - r} L 0 0 Z`;
    return p;
  }

  return p;
}

export default function BlockSvgShape({
  width = 120,
  height = 36,
  type = 'statement',
  color = '#8A5BA7',
  darkColor = '#6B4284',
  isExecuting = false,
}) {
  const pathData = buildBlockPath({ w: width, h: height, type });
  const totalSvgHeight = height + 6;

  return (
    <svg
      width={width}
      height={totalSvgHeight}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        overflow: 'visible',
        zIndex: 0,
      }}
    >
      <path
        d={pathData}
        fill={color}
        stroke={isExecuting ? '#fde047' : darkColor}
        strokeWidth={isExecuting ? '2.5' : '1.2'}
        style={{
          filter: isExecuting
            ? 'drop-shadow(0 0 8px #f59e0b) drop-shadow(0 0 2px #f59e0b)'
            : 'drop-shadow(0 1.5px 2px rgba(0, 0, 0, 0.16))',
          transition: 'stroke 0.15s ease, filter 0.15s ease',
        }}
      />
    </svg>
  );
}
