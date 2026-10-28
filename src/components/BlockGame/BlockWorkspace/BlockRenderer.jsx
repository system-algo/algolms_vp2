import React from 'react';
import { BLOCK_DEFINITIONS, BLOCK_TYPES } from './blockDefinitions.js';

export default function BlockRenderer({
  block,
  isToolbox = false,
  isGhost = false,
  activeBlockId = null,
  onStartDrag,
  onParamChange,
  dropTarget = null,
}) {
  const def = BLOCK_DEFINITIONS[block.type] || {};
  const isHat = def.kind === 'hat';
  const isCBlock = def.kind === 'c_block';
  const isExecuting = activeBlockId === block.id;

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
      const selectedOption =
        paramDef.options.find((o) => o.value === Number(currentDir)) || paramDef.options[1];

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

    if (
      block.type === BLOCK_TYPES.TURN_CLOCKWISE ||
      block.type === BLOCK_TYPES.TURN_COUNTERCLOCKWISE
    ) {
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
    const activeTargetId = dropTarget?.targetId || dropTarget?.blockId;
    const isTargetInside = activeTargetId === block.id && dropTarget?.position === 'inside';

    return (
      <div
        className={`block-node-wrapper ${isExecuting ? 'is-executing' : ''}`}
        style={{ margin: '3px 0', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
      >
        {/* Top Header Bar of C-Block */}
        <div
          data-block-id={block.id}
          onPointerDown={handlePointerDown}
          style={{
            background: def.color,
            color: '#fff',
            padding: '7px 14px 7px 12px',
            borderRadius: '6px 6px 0 0',
            fontWeight: 700,
            fontSize: '13px',
            display: 'inline-flex',
            alignItems: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
            cursor: 'grab',
            border: `1px solid ${def.darkColor}`,
            borderBottomWidth: '2px',
          }}
        >
          {renderContent()}
        </div>

        {/* Indented Inner Slot for Child Blocks */}
        <div
          className="block-c-slot"
          data-slot-for={block.id}
          style={{
            borderColor: def.color,
            borderLeftWidth: '16px',
            borderLeftStyle: 'solid',
            padding: '4px 0 4px 12px',
            minHeight: '36px',
            background: isTargetInside ? 'rgba(250, 204, 21, 0.2)' : 'transparent',
            transition: 'background 0.15s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {Array.isArray(block.children) && block.children.length > 0 ? (
            <>
              {block.children.map((childBlock) => {
                const isChildBefore =
                  activeTargetId === childBlock.id && dropTarget?.position === 'before';
                const isChildAfter =
                  activeTargetId === childBlock.id && dropTarget?.position === 'after';

                return (
                  <React.Fragment key={childBlock.id}>
                    {isChildBefore && <div className="block-drop-indicator" />}
                    <BlockRenderer
                      block={childBlock}
                      activeBlockId={activeBlockId}
                      onStartDrag={onStartDrag}
                      onParamChange={onParamChange}
                      dropTarget={dropTarget}
                    />
                    {isChildAfter && <div className="block-drop-indicator" />}
                  </React.Fragment>
                );
              })}
              {isTargetInside && <div className="block-drop-indicator" />}
            </>
          ) : (
            <div
              data-slot-placeholder-for={block.id}
              style={{
                height: '30px',
                minWidth: '160px',
                maxWidth: '240px',
                border: isTargetInside ? '2px dashed #f59e0b' : '2px dashed #cbd5e1',
                borderRadius: '6px',
                margin: '4px 0',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 12px',
                color: isTargetInside ? '#b45309' : '#94a3b8',
                fontSize: '11px',
                fontWeight: 600,
                background: isTargetInside ? '#fef3c7' : 'rgba(255, 255, 255, 0.65)',
                transition: 'all 0.15s ease',
                cursor: 'default',
              }}
            >
              drop commands here
            </div>
          )}
        </div>

        {/* Bottom Bracket of C-Block */}
        <div
          data-block-id={block.id}
          data-c-bottom="true"
          style={{
            background: def.color,
            height: '14px',
            width: '84px',
            borderRadius: '0 0 6px 6px',
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
          borderRadius: isHat ? '14px 14px 4px 4px' : '6px',
          fontWeight: 700,
          fontSize: '13px',
          display: 'inline-flex',
          alignItems: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
          cursor: isHat ? 'default' : 'grab',
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
