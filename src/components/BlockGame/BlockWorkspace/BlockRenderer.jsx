import React, { useRef, useState, useLayoutEffect } from 'react';
import { BLOCK_DEFINITIONS, BLOCK_TYPES } from './blockDefinitions.js';
import BlockSvgShape from './BlockSvgShape';

export default function BlockRenderer({
  block,
  compact = false,
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

  const contentRef = useRef(null);
  const [contentWidth, setContentWidth] = useState(130);

  // Measure content width dynamically
  useLayoutEffect(() => {
    if (contentRef.current) {
      const outerWidth = contentRef.current.scrollWidth || contentRef.current.offsetWidth;
      const measured = compact ? Math.max(60, outerWidth - 24) : outerWidth;
      if (measured && Math.abs(measured - contentWidth) > 1) {
        setContentWidth(Math.max(compact ? 60 : 80, measured));
      }
    }
  }, [block.type, block.params, def.label, compact]);

  // Drag start handler
  const handlePointerDown = (e) => {
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'OPTION') {
      return; // allow select dropdown interaction
    }
    if (isHat) {
      return; // "When Start clicked" is fixed
    }
    e.stopPropagation();
    onStartDrag?.(block, e);
  };

  const handleSelectChange = (paramName, value) => {
    onParamChange?.(block.id, paramName, value);
  };

  // Render internal block text and dropdown pills
  const renderContent = () => {
    if (isHat) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span>{def.label}</span>
        </span>
      );
    }

    if (block.type.startsWith('go_to_')) return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span>go to X</span>{def.params.map((param, i) => <React.Fragment key={param.name}>{i === 1 && <span>Y</span>}<span className="block-dropdown-pill" style={{ position: 'relative' }}><span>{block.params?.[param.name] ?? param.default} ▾</span><select aria-label={`Coordinate ${param.name.toUpperCase()}`} className="block-select-input" value={block.params?.[param.name] ?? param.default} onChange={e => handleSelectChange(param.name, Number(e.target.value))} disabled={isToolbox}>{param.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></span></React.Fragment>)}</span>;
    if (block.type === BLOCK_TYPES.POINT_DIRECTION) {
      const currentDir = block.params?.direction ?? 90;
      const paramDef = def.params[0];
      const selectedOption =
        paramDef.options.find((o) => o.value === Number(currentDir)) || paramDef.options[1];

      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
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
      const times = block.params?.times ?? 2;
      const paramDef = def.params[0];

      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
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

    if (block.type === BLOCK_TYPES.TURN_DIRECTION) {
      const dir = block.params?.direction || 'left';
      const paramDef = def.params[0];
      const selectedOption =
        paramDef.options.find((o) => o.value === dir) || paramDef.options[0];

      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <span>turn</span>
          <span className="block-dropdown-pill" style={{ position: 'relative' }}>
            <span>{selectedOption.label} ▾</span>
            <select
              className="block-select-input"
              value={dir}
              onChange={(e) => handleSelectChange('direction', e.target.value)}
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

    if (
      block.type === BLOCK_TYPES.TURN_CLOCKWISE ||
      block.type === BLOCK_TYPES.TURN_COUNTERCLOCKWISE
    ) {
      const angle = block.params?.angle ?? 30;
      const paramDef = def.params[0];

      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <span>{def.label}</span>
          <span className="block-dropdown-pill" style={{ position: 'relative' }}>
            <span>{angle} ▾</span>
            <select
              className="block-select-input"
              value={angle}
              onChange={(e) => handleSelectChange('angle', Number(e.target.value))}
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

    // Default simple statement label (e.g. destroy, water, move forward)
    return <span>{def.label}</span>;
  };

  const blockHeight = compact ? 24 : 34;
  const totalWidth = contentWidth + 24;

  // C-Block (Repeat) Rendering
  if (isCBlock && !isToolbox) {
    const activeTargetId = dropTarget?.targetId || dropTarget?.blockId;
    const isTargetInside = activeTargetId === block.id && dropTarget?.position === 'inside';
    const bottomBracketWidth = Math.max(72, Math.min(100, totalWidth * 0.65));

    return (
      <div
        className={`block-node-wrapper c-block-root ${isExecuting ? 'is-executing' : ''}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          position: 'relative',
        }}
      >
        {/* Top Header Bar of C-Block */}
        <div
          data-block-id={block.id}
          data-block-type={block.type}
          data-c-header="true"
          onPointerDown={handlePointerDown}
          style={{
            position: 'relative',
            width: `${totalWidth}px`,
            height: `${blockHeight}px`,
            cursor: 'grab',
            userSelect: 'none',
          }}
        >
          {/* Vector SVG interlocking shape */}
          <BlockSvgShape
            width={totalWidth}
            height={blockHeight}
            type="c_header"
            color={def.color || '#20B26C'}
            darkColor={def.darkColor || '#16804D'}
            isExecuting={isExecuting}
          />

          {/* HTML content layer */}
          <div
            ref={contentRef}
            style={{
              position: 'relative',
              zIndex: 1,
              padding: '0 12px 0 14px',
              height: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              color: '#ffffff',
              fontSize: compact ? '12px' : '12.5px',
              fontWeight: compact ? 400 : 700,
              whiteSpace: 'nowrap',
            }}
          >
            {renderContent()}
          </div>
        </div>

        {/* Middle: Spine and Children Slot */}
        <div
          className="block-c-slot-container"
          style={{
            display: 'flex',
            width: '100%',
            position: 'relative',
            marginTop: '-4px', // Interlock with header
            zIndex: 1,
          }}
        >
          {/* Left Vertical Spine (width: 16px) */}
          <div
            className="block-c-spine"
            style={{
              width: '16px',
              backgroundColor: def.color || '#20B26C',
              borderLeft: `1.2px solid ${def.darkColor || '#16804D'}`,
              borderRight: `1.2px solid ${def.darkColor || '#16804D'}`,
              boxSizing: 'border-box',
              flexShrink: 0,
            }}
          />

          {/* Children Slot (NO LIMIT on capacity!) */}
          <div
            className="block-c-slot"
            data-slot-for={block.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              flex: 1,
              minHeight: '34px',
              padding: '2px 4px',
              background: isTargetInside ? 'rgba(250, 204, 21, 0.25)' : 'transparent',
              borderRadius: '4px',
              transition: 'background 0.15s ease',
            }}
          >
            {Array.isArray(block.children) && block.children.length > 0 ? (
              <div
                data-slot-for={block.id}
                style={{ display: 'flex', flexDirection: 'column', width: '100%' }}
              >
                {block.children.map((childBlock, cIdx) => {
                  const isChildBefore =
                    activeTargetId === childBlock.id && dropTarget?.position === 'before';
                  const isChildAfter =
                    activeTargetId === childBlock.id && dropTarget?.position === 'after';

                  return (
                    <React.Fragment key={childBlock.id}>
                      {isChildBefore && <div className="block-drop-indicator" />}
                      <div style={{ display: 'block', marginTop: cIdx === 0 ? '-4px' : '-4px' }}>
                        <BlockRenderer compact={compact}
                          block={childBlock}
                          activeBlockId={activeBlockId}
                          onStartDrag={onStartDrag}
                          onParamChange={onParamChange}
                          dropTarget={dropTarget}
                        />
                      </div>
                      {isChildAfter && <div className="block-drop-indicator" />}
                    </React.Fragment>
                  );
                })}
                {isTargetInside && <div className="block-drop-indicator" />}
              </div>
            ) : (
              <div
                data-slot-for={block.id}
                data-slot-placeholder-for={block.id}
                style={{
                  height: '28px',
                  minWidth: '140px',
                  maxWidth: '220px',
                  border: isTargetInside ? '2px dashed #f59e0b' : '1.5px dashed #a7f3d0',
                  borderRadius: '6px',
                  margin: '2px 0 4px 4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 12px',
                  color: isTargetInside ? '#b45309' : '#047857',
                  fontSize: '11px',
                  fontWeight: compact ? 400 : 700,
                  background: isTargetInside ? '#fef3c7' : 'rgba(255, 255, 255, 0.45)',
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                }}
              >
                drop commands here
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bracket of C-Block */}
        <div
          data-block-id={block.id}
          data-block-type={block.type}
          data-c-bottom="true"
          style={{
            position: 'relative',
            width: `${bottomBracketWidth}px`,
            height: '14px',
            marginTop: '-4px', // Interlock with last child block
            cursor: 'grab',
            userSelect: 'none',
            zIndex: 2,
          }}
        >
          <BlockSvgShape
            width={bottomBracketWidth}
            height={14}
            type="c_bottom"
            color={def.color || '#20B26C'}
            darkColor={def.darkColor || '#16804D'}
            isExecuting={isExecuting}
          />
        </div>
      </div>
    );
  }

  // Standard Statement Block or Hat Block
  const shapeType = isHat ? 'hat' : 'statement';

  return (
    <div
      className={`block-node-wrapper ${isExecuting ? 'is-executing' : ''} ${isGhost ? 'is-dragging' : ''}`}
      style={{
        display: 'inline-block',
        position: 'relative',
        userSelect: 'none',
      }}
      data-block-id={block.id}
      data-block-type={block.type}
    >
      <div
        data-block-id={block.id}
        data-block-type={block.type}
        onPointerDown={handlePointerDown}
        style={{
          position: 'relative',
          width: `${totalWidth}px`,
          height: `${blockHeight}px`,
          cursor: isHat ? 'default' : 'grab',
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        {/* Exact Puzzle Notch Vector SVG Shape */}
        <BlockSvgShape
          width={totalWidth}
          height={blockHeight}
          type={shapeType}
          color={compact && !isHat && !isCBlock && !['destroy', 'water'].includes(block.type) ? '#995ba7' : def.color || '#8A5BA7'}
          darkColor={def.darkColor || '#6B4284'}
          isExecuting={isExecuting}
        />

        {/* Content Layer */}
        <div
          ref={contentRef}
          style={{
            position: 'relative',
            zIndex: 1,
            padding: isHat ? '0 14px 0 16px' : '0 12px 0 14px',
            height: '100%',
            display: 'inline-flex',
            alignItems: 'center',
            color: '#ffffff',
            fontSize: compact ? '12px' : '12.5px',
            fontWeight: compact ? 400 : 700,
            whiteSpace: 'nowrap',
          }}
        >
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
