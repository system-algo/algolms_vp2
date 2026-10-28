import React from 'react';
import { BLOCK_DEFINITIONS, BLOCK_TYPES } from './blockDefinitions.js';

/**
 * Path Generator for Notch and Tab Puzzle Connectors (Blockly / Scratch style)
 * Notch at x=15 to x=30: height 4px, width 15px
 */
export function generateBlockSvgPath(width, height, isHat = false, hasBottomTab = true) {
  const w = Math.max(width, 140);
  const h = height;

  if (isHat) {
    // Top hat: curve up from left to right, then flat to right, then down
    return `
      M 0 12
      C 0 4, 8 0, 16 0
      H ${w - 8}
      C ${w} 0, ${w} 4, ${w} 12
      V ${h}
      H 31
      L 25 ${h + 4}
      L 22 ${h + 4}
      L 16 ${h}
      H 8
      C 4 ${h}, 0 ${h - 4}, 0 ${h - 8}
      Z
    `;
  }

  // Standard statement block with top notch and bottom tab
  let d = `
    M 0 4
    C 0 2, 2 0, 4 0
    H 16
    L 22 4
    L 25 4
    L 31 0
    H ${w - 4}
    C ${w - 2} 0, ${w} 2, ${w} 4
    V ${h - 4}
    C ${w} ${h - 2}, ${w - 2} ${h}, ${w - 4} ${h}
  `;

  if (hasBottomTab) {
    d += `
      H 31
      L 25 ${h + 4}
      L 22 ${h + 4}
      L 16 ${h}
      H 4
      C 2 ${h}, 0 ${h - 2}, 0 ${h - 4}
      Z
    `;
  } else {
    d += `
      H 4
      C 2 ${h}, 0 ${h - 2}, 0 ${h - 4}
      Z
    `;
  }

  return d;
}

export default function BlockRenderer({
  block,
  isToolbox = false,
  isGhost = false,
  isExecuting = false,
  onStartDrag,
  onParamChange,
  onDropBefore,
  onDropAfter,
  onDropInside,
  dropTarget,
}) {
  const def = BLOCK_DEFINITIONS[block.type] || {};
  const isHat = def.kind === 'hat';
  const isCBlock = def.kind === 'c_block';

  // Drag start handler
  const handlePointerDown = (e) => {
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'OPTION') {
      return; // allow select dropdown interaction
    }
    e.stopPropagation();
    onStartDrag?.(block, e);
  };

  const handleSelectChange = (paramName, value) => {
    onParamChange?.(block.id, paramName, value);
  };

  // Render internal block content
  const renderContent = () => {
    if (isHat) {
      return (
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>{def.label}</span>
        </span>
      );
    }

    if (block.type === BLOCK_TYPES.POINT_DIRECTION) {
      const currentDir = block.params?.direction ?? 90;
      const paramDef = def.params[0];
      const selectedOption = paramDef.options.find((o) => o.value === Number(currentDir)) || paramDef.options[1];

      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span>point in direction</span>
          <span className="block-dropdown-pill" style={{ position: 'relative' }}>
            <span>{selectedOption.label} ▾</span>
            <select
              className="block-select-input"
              value={currentDir}
              onChange={(e) => handleSelectChange('direction', Number(e.target.value))}
              disabled={isToolbox}
            >
              {paramDef.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </span>
        </span>
      );
    }

    if (block.type === BLOCK_TYPES.REPEAT) {
      const times = block.params?.times ?? 4;
      const paramDef = def.params[0];

      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span>repeat</span>
          <span className="block-dropdown-pill" style={{ position: 'relative' }}>
            <span>{times} ▾</span>
            <select
              className="block-select-input"
              value={times}
              onChange={(e) => handleSelectChange('times', Number(e.target.value))}
              disabled={isToolbox}
            >
              {paramDef.options.map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </span>
          <span>times</span>
        </span>
      );
    }

    if (block.type === BLOCK_TYPES.TURN_CLOCKWISE || block.type === BLOCK_TYPES.TURN_COUNTERCLOCKWISE) {
      const angle = block.params?.angle ?? 30;
      const paramDef = def.params[0];

      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span>{def.label}</span>
          <span className="block-dropdown-pill" style={{ position: 'relative' }}>
            <span>{angle}° ▾</span>
            <select
              className="block-select-input"
              value={angle}
              onChange={(e) => handleSelectChange('angle', Number(e.target.value))}
              disabled={isToolbox}
            >
              {paramDef.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}°
                </option>
              ))}
            </select>
          </span>
        </span>
      );
    }

    // Default simple label
    return <span>{def.label}</span>;
  };

  // C-Block (Repeat) rendering
  if (isCBlock && !isToolbox) {
    const isTargetInside = dropTarget?.blockId === block.id && dropTarget?.position === 'inside';

    return (
      <div
        className={`block-node-wrapper ${isExecuting ? 'is-executing' : ''}`}
        style={{ margin: '3px 0' }}
        data-block-id={block.id}
      >
        {/* Top Header Bar of C-Block */}
        <div
          onPointerDown={handlePointerDown}
          style={{
            background: def.color,
            color: '#fff',
            padding: '7px 14px 7px 12px',
            borderRadius: '5px 5px 0 0',
            fontWeight: 700,
            fontSize: '13px',
            display: 'inline-flex',
            alignItems: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
            cursor: 'grab',
            border: `1px solid ${def.darkColor}`,
          }}
        >
          {renderContent()}
        </div>

        {/* Indented Inner Slot for Child Blocks */}
        <div
          className="block-c-slot"
          style={{
            borderColor: def.color,
            padding: '4px 0 4px 8px',
            minHeight: '34px',
            background: isTargetInside ? 'rgba(250, 204, 21, 0.15)' : 'transparent',
            transition: 'background 0.15s ease',
          }}
          data-slot-for={block.id}
        >
          {isTargetInside && <div className="block-drop-indicator" />}

          {Array.isArray(block.children) && block.children.length > 0 ? (
            block.children.map((childBlock) => (
              <BlockRenderer
                key={childBlock.id}
                block={childBlock}
                isExecuting={childBlock.id === isExecuting}
                onStartDrag={onStartDrag}
                onParamChange={onParamChange}
                dropTarget={dropTarget}
              />
            ))
          ) : (
            <div
              style={{
                height: '24px',
                border: '1px dashed rgba(0,0,0,0.15)',
                borderRadius: '4px',
                margin: '2px 0',
                display: 'flex',
                alignItems: 'center',
                paddingLeft: '8px',
                color: '#94a3b8',
                fontSize: '11px',
              }}
            >
              drop commands here
            </div>
          )}
        </div>

        {/* Bottom Bracket of C-Block */}
        <div
          style={{
            background: def.color,
            height: '12px',
            width: '80px',
            borderRadius: '0 0 5px 5px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
            border: `1px solid ${def.darkColor}`,
            borderTop: 'none',
          }}
        />
      </div>
    );
  }

  // Standard Block Rendering
  return (
    <div
      className={`block-node-wrapper ${isExecuting ? 'is-executing' : ''} ${isGhost ? 'is-dragging' : ''}`}
      style={{
        margin: isToolbox ? '0' : '3px 0',
        display: 'inline-block',
      }}
      data-block-id={block.id}
    >
      <div
        onPointerDown={handlePointerDown}
        style={{
          background: def.color || '#8A5BA7',
          color: '#ffffff',
          padding: isHat ? '10px 16px 8px 14px' : '7px 14px 7px 12px',
          borderRadius: isHat ? '14px 14px 4px 4px' : '5px',
          fontWeight: 700,
          fontSize: '13px',
          display: 'inline-flex',
          alignItems: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
          cursor: isHat ? 'default' : isToolbox ? 'grab' : 'grab',
          border: `1px solid ${def.darkColor || '#6B4284'}`,
          borderBottomWidth: '2px',
          transition: 'transform 0.1s ease',
        }}
      >
        {renderContent()}
      </div>
    </div>
  );
}
