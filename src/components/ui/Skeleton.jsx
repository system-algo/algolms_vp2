import React from 'react';

export function SkeletonLine({ width = '100%' }) {
  return <span className="ux-skeleton ux-skeleton--line" style={{ width }} aria-hidden="true" />;
}

export function SkeletonCard({ lines = 3, className = '' }) {
  return (
    <div className={`ux-skeleton-card ${className}`.trim()} aria-hidden="true">
      <span className="ux-skeleton ux-skeleton--title" />
      {Array.from({ length: lines }, (_, index) => (
        <SkeletonLine key={index} width={index === lines - 1 ? '62%' : '100%'} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 6, columns = 5 }) {
  return (
    <div className="ux-skeleton-table" aria-label="Loading" role="status">
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div className="ux-skeleton-table__row" key={rowIndex}>
          {Array.from({ length: columns }, (_, columnIndex) => (
            <SkeletonLine
              key={columnIndex}
              width={columnIndex === 0 ? '78%' : columnIndex === columns - 1 ? '55%' : '68%'}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
