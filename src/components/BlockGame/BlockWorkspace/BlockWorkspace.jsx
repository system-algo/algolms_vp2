import React, { useState, useRef, useEffect, useCallback } from 'react';
import BlockRenderer from './BlockRenderer';
import {
  BLOCK_DEFINITIONS,
  BLOCK_TYPES,
  createBlockInstance,
  countCommands,
} from './blockDefinitions.js';
import './BlockWorkspace.css';

/**
 * Recursive helpers to find, insert, and remove blocks in the tree
 */
function removeBlockFromTree(blocks, blockId) {
  const result = [];
  let removed = null;

  for (const blk of blocks) {
    if (blk.id === blockId) {
      removed = blk;
      continue;
    }

    if (Array.isArray(blk.children)) {
      const childRes = removeBlockFromTree(blk.children, blockId);
      if (childRes.removed) {
        removed = childRes.removed;
      }
      result.push({
        ...blk,
        children: childRes.blocks,
      });
    } else {
      result.push(blk);
    }
  }

  return { blocks: result, removed };
}

function updateParamInTree(blocks, blockId, paramName, value) {
  return blocks.map((blk) => {
    if (blk.id === blockId) {
      return {
        ...blk,
        params: {
          ...blk.params,
          [paramName]: value,
        },
      };
    }
    if (Array.isArray(blk.children)) {
      return {
        ...blk,
        children: updateParamInTree(blk.children, blockId, paramName, value),
      };
    }
    return blk;
  });
}

export default function BlockWorkspace({
  blocks = [],
  onChangeBlocks,
  toolboxBlockTypes = [
    BLOCK_TYPES.MOVE_FORWARD,
    BLOCK_TYPES.POINT_DIRECTION,
    BLOCK_TYPES.TAKE_CARGO,
    BLOCK_TYPES.REPEAT,
  ],
  maxCommands = null,
  activeBlockId = null,
  isExecuting = false,
}) {
  const workspaceRef = useRef(null);
  const toolboxRef = useRef(null);

  // Dragging state
  const [draggingBlock, setDraggingBlock] = useState(null);
  const [dragPointerPos, setDragPointerPos] = useState({ x: 0, y: 0 });
  const [dropTarget, setDropTarget] = useState(null); // { blockId, position: 'after' | 'inside' }
  const [isOverTrash, setIsOverTrash] = useState(false);

  // Handle parameter changes (e.g. angle dropdown, repeat count)
  const handleParamChange = useCallback(
    (blockId, paramName, value) => {
      const updated = updateParamInTree(blocks, blockId, paramName, value);
      onChangeBlocks?.(updated);
    },
    [blocks, onChangeBlocks]
  );

  // Start dragging a block (either from toolbox or from workspace)
  const handleStartDrag = (block, e) => {
    if (isExecuting) return; // cannot edit while running

    const isFromToolbox = !blocks.some((b) => b.id === block.id || (b.children && b.children.some(c => c.id === block.id)));
    const blockToDrag = isFromToolbox ? createBlockInstance(block.type) : block;

    setDraggingBlock({
      ...blockToDrag,
      isFromToolbox,
      sourceId: block.id,
    });

    setDragPointerPos({ x: e.clientX, y: e.clientY });
  };

  // Global pointer move during drag
  useEffect(() => {
    if (!draggingBlock) return;

    const handlePointerMove = (e) => {
      setDragPointerPos({ x: e.clientX, y: e.clientY });

      // Check if pointer is hovering over trash / toolbox
      if (toolboxRef.current) {
        const tbRect = toolboxRef.current.getBoundingClientRect();
        if (
          e.clientX >= tbRect.left &&
          e.clientX <= tbRect.right &&
          e.clientY >= tbRect.top &&
          e.clientY <= tbRect.bottom
        ) {
          setIsOverTrash(true);
          setDropTarget(null);
          return;
        }
      }
      setIsOverTrash(false);

      // Check element under pointer
      const elements = document.elementsFromPoint(e.clientX, e.clientY);

      // 1. Check if hovering inside a C-Block slot
      const slotElement = elements.find((el) => el.hasAttribute('data-slot-for'));
      if (slotElement) {
        const targetCBlockId = slotElement.getAttribute('data-slot-for');
        if (targetCBlockId !== draggingBlock.id) {
          setDropTarget({ blockId: targetCBlockId, position: 'inside' });
          return;
        }
      }

      // 2. Check if hovering on/near a block node
      const blockElement = elements.find((el) => el.hasAttribute('data-block-id'));
      if (blockElement) {
        const targetBlockId = blockElement.getAttribute('data-block-id');
        if (targetBlockId !== draggingBlock.id) {
          const rect = blockElement.getBoundingClientRect();
          const relativeY = e.clientY - rect.top;
          const position = relativeY > rect.height / 2 ? 'after' : 'before';
          setDropTarget({ blockId: targetBlockId, position });
          return;
        }
      }

      // 3. If in workspace but not over specific block, append to end of main stack
      if (workspaceRef.current) {
        const wsRect = workspaceRef.current.getBoundingClientRect();
        if (
          e.clientX >= wsRect.left &&
          e.clientX <= wsRect.right &&
          e.clientY >= wsRect.top &&
          e.clientY <= wsRect.bottom
        ) {
          const lastBlock = blocks[blocks.length - 1];
          if (lastBlock) {
            setDropTarget({ blockId: lastBlock.id, position: 'after' });
            return;
          }
        }
      }

      setDropTarget(null);
    };

    const handlePointerUp = () => {
      if (!draggingBlock) return;

      // If dragged to trash / toolbox, delete if it was from workspace
      if (isOverTrash) {
        if (!draggingBlock.isFromToolbox) {
          const { blocks: updated } = removeBlockFromTree(blocks, draggingBlock.id);
          onChangeBlocks?.(updated);
        }
      } else if (dropTarget) {
        // Remove block from current position if it was in the workspace
        let cleanBlocks = blocks;
        if (!draggingBlock.isFromToolbox) {
          const res = removeBlockFromTree(blocks, draggingBlock.id);
          cleanBlocks = res.blocks;
        }

        // Insert into target position
        const blockToInsert = {
          id: draggingBlock.id,
          type: draggingBlock.type,
          params: draggingBlock.params || {},
          children: draggingBlock.children || (BLOCK_DEFINITIONS[draggingBlock.type]?.kind === 'c_block' ? [] : undefined),
        };

        const insertInto = (list) => {
          const res = [];
          for (const item of list) {
            if (item.id === dropTarget.blockId) {
              if (dropTarget.position === 'before') {
                res.push(blockToInsert);
                res.push(item);
              } else if (dropTarget.position === 'after') {
                res.push(item);
                res.push(blockToInsert);
              } else if (dropTarget.position === 'inside') {
                res.push({
                  ...item,
                  children: [...(item.children || []), blockToInsert],
                });
              }
            } else {
              if (Array.isArray(item.children)) {
                res.push({
                  ...item,
                  children: insertInto(item.children),
                });
              } else {
                res.push(item);
              }
            }
          }
          return res;
        };

        const nextBlocks = insertInto(cleanBlocks);
        onChangeBlocks?.(nextBlocks);
      }

      setDraggingBlock(null);
      setDropTarget(null);
      setIsOverTrash(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggingBlock, dropTarget, isOverTrash, blocks, onChangeBlocks]);

  const commandCount = countCommands(blocks);
  const isLimitReached = maxCommands !== null && commandCount >= maxCommands;

  return (
    <div className="block-editor-container">
      {/* LEFT TOOLBOX */}
      <div className="block-toolbox" ref={toolboxRef}>
        <div className="toolbox-header">Blocks</div>
        <div className="toolbox-blocks-list">
          {toolboxBlockTypes.map((type) => {
            const def = BLOCK_DEFINITIONS[type];
            if (!def) return null;
            const dummyBlock = { id: `toolbox_${type}`, type, params: {} };
            return (
              <div
                key={type}
                className="toolbox-item-wrapper"
                onPointerDown={(e) => handleStartDrag(dummyBlock, e)}
              >
                <BlockRenderer
                  block={dummyBlock}
                  isToolbox
                  onStartDrag={() => {}}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* CENTER WORKSPACE */}
      <div className="block-workspace" ref={workspaceRef}>
        <div className={`workspace-stats ${isLimitReached ? 'limit-reached' : ''}`}>
          commands used: {commandCount}
          {maxCommands !== null ? ` / ${maxCommands}` : ''}
        </div>

        <div className="workspace-block-canvas">
          {blocks.map((block, idx) => {
            const isTargetBefore = dropTarget?.blockId === block.id && dropTarget?.position === 'before';
            const isTargetAfter = dropTarget?.blockId === block.id && dropTarget?.position === 'after';

            return (
              <React.Fragment key={block.id}>
                {isTargetBefore && <div className="block-drop-indicator" />}
                <div style={{ display: 'block' }}>
                  <BlockRenderer
                    block={block}
                    isExecuting={activeBlockId === block.id}
                    onStartDrag={handleStartDrag}
                    onParamChange={handleParamChange}
                    dropTarget={dropTarget}
                  />
                </div>
                {isTargetAfter && <div className="block-drop-indicator" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* DRAG GHOST LAYER */}
      {draggingBlock && (
        <div
          className="drag-ghost-layer"
          style={{
            left: `${dragPointerPos.x}px`,
            top: `${dragPointerPos.y}px`,
          }}
        >
          <BlockRenderer block={draggingBlock} isGhost />
        </div>
      )}

      {/* TRASH ZONE INDICATOR */}
      <div className={`workspace-trash-zone ${draggingBlock && !draggingBlock.isFromToolbox ? 'visible' : ''} ${isOverTrash ? 'hovered' : ''}`}>
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </div>
    </div>
  );
}
