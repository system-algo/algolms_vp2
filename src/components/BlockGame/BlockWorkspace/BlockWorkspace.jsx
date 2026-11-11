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
 * Check if targetId is the source block itself or any descendant of source
 */
function isDescendantOrSelf(source, targetId) {
  if (!source || !targetId) return false;
  if (source.id === targetId) return true;
  if (Array.isArray(source.children)) {
    for (const child of source.children) {
      if (child.id === targetId || isDescendantOrSelf(child, targetId)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Recursive removal of a block by ID from tree (root or nested inside C-blocks)
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

/**
 * Recursive insertion of a block into tree at target location
 */
function insertBlockIntoTree(blocks, targetId, position, blockToInsert) {
  if (position === 'root_end' || !targetId) {
    return [...blocks, blockToInsert];
  }

  let inserted = false;

  function walk(list) {
    const res = [];
    for (const item of list) {
      if (item.id === targetId) {
        inserted = true;
        if (position === 'before') {
          res.push(blockToInsert);
          res.push(item);
        } else if (position === 'after') {
          res.push(item);
          res.push(blockToInsert);
        } else if (position === 'inside') {
          res.push({
            ...item,
            children: [...(item.children || []), blockToInsert],
          });
        }
      } else {
        if (Array.isArray(item.children)) {
          res.push({
            ...item,
            children: walk(item.children),
          });
        } else {
          res.push(item);
        }
      }
    }
    return res;
  }

  const updated = walk(blocks);
  if (!inserted) {
    // Fallback: append safely to root if target wasn't found
    return [...updated, blockToInsert];
  }
  return updated;
}

/**
 * Update parameters (e.g. repeat count or angle) in tree recursively
 */
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
  compact = false,
  maxCommands = null,
  activeBlockId = null,
  isExecuting = false,
}) {
  const workspaceRef = useRef(null);
  const toolboxRef = useRef(null);

  // Dragging state
  const [draggingBlock, setDraggingBlock] = useState(null);
  const [dragPointerPos, setDragPointerPos] = useState({ x: 0, y: 0 });
  const [dropTarget, setDropTargetState] = useState(null); // { blockId, targetId, position: 'before' | 'after' | 'inside' | 'root_end' }
  const [isOverTrash, setIsOverTrashState] = useState(false);
  const dropTargetRef = useRef(null);
  const trashRef = useRef(false);
  const setDropTarget = (target) => { dropTargetRef.current = target; setDropTargetState(target); };
  const setIsOverTrash = (value) => { trashRef.current = value; setIsOverTrashState(value); };

  // Handle parameter changes (e.g. angle dropdown, repeat count)
  const handleParamChange = useCallback(
    (blockId, paramName, value) => {
      const updated = updateParamInTree(blocks, blockId, paramName, value);
      onChangeBlocks?.(updated);
    },
    [blocks, onChangeBlocks]
  );

  // Start dragging a block (either from toolbox or from workspace / loop)
  const handleStartDrag = (block, e) => {
    if (isExecuting) return; // cannot edit while running

    setDropTarget(null);
    setIsOverTrash(false);
    const isFromToolbox = String(block.id).startsWith('toolbox_');
    const blockToDrag = isFromToolbox
      ? {
          ...createBlockInstance(block.type),
          params: { ...block.params },
        }
      : block;

    setDraggingBlock({
      ...blockToDrag,
      isFromToolbox,
      sourceId: block.id,
    });

    setDragPointerPos({ x: e.clientX, y: e.clientY });
  };

  // Global pointer move and drop handling during drag
  useEffect(() => {
    if (!draggingBlock) return;

    const handlePointerMove = (e) => {
      setDragPointerPos({ x: e.clientX, y: e.clientY });

      // 1. Check if hovering over toolbox or trash zone on the left
      // Only blocks dragged FROM the workspace can be deleted/trashed!
      if (!draggingBlock.isFromToolbox && toolboxRef.current) {
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

      // 2. Scan elements under pointer for drop targeting
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      let foundTarget = null;

      // Pass A: Check if hovering directly inside a C-Block's slot / placeholder
      for (const el of elements) {
        if (el.hasAttribute('data-slot-for') || el.hasAttribute('data-slot-placeholder-for')) {
          const cBlockId = el.getAttribute('data-slot-for') || el.getAttribute('data-slot-placeholder-for');
          if (!isDescendantOrSelf(draggingBlock, cBlockId) && !cBlockId.startsWith('toolbox_')) {
            foundTarget = { blockId: cBlockId, targetId: cBlockId, position: 'inside' };
            break;
          }
        }
      }

      // Pass B: Check for specific block element (child block, root block, C-header, or C-bottom bracket)
      if (!foundTarget) {
        for (const el of elements) {
          if (el.hasAttribute('data-block-id')) {
            const tid = el.getAttribute('data-block-id');
            const bType = el.getAttribute('data-block-type');

            // Skip if target is the dragging block itself, or one of its descendants, or a toolbox block
            if (isDescendantOrSelf(draggingBlock, tid) || tid.startsWith('toolbox_')) {
              continue;
            }

            // Bottom bracket of a C-block -> always insert AFTER the whole C-block
            if (el.hasAttribute('data-c-bottom')) {
              foundTarget = { blockId: tid, targetId: tid, position: 'after' };
              break;
            }

            // Top Header of a C-block (repeat) -> if mouse is near bottom half of header, insert INSIDE
            if (el.hasAttribute('data-c-header') || bType === BLOCK_TYPES.REPEAT) {
              const rect = el.getBoundingClientRect();
              const relativeY = e.clientY - rect.top;
              if (relativeY > rect.height / 2) {
                foundTarget = { blockId: tid, targetId: tid, position: 'inside' };
              } else {
                foundTarget = { blockId: tid, targetId: tid, position: 'before' };
              }
              break;
            }

            // Start hat block -> can ONLY insert AFTER it (never before!)
            if (bType === BLOCK_TYPES.START_HAT || tid === 'start_hat' || tid.includes('start')) {
              foundTarget = { blockId: tid, targetId: tid, position: 'after' };
              break;
            }

            // Normal or child block: determine before or after based on pointer vertical half
            const rect = el.getBoundingClientRect();
            const relativeY = e.clientY - rect.top;
            const position = relativeY > rect.height / 2 ? 'after' : 'before';
            foundTarget = { blockId: tid, targetId: tid, position };
            break;
          }
        }
      }

      // Pass C: If in workspace canvas (e.g. empty space below or beside blocks)
      if (!foundTarget && workspaceRef.current) {
        const wsRect = workspaceRef.current.getBoundingClientRect();
        if (
          e.clientX >= wsRect.left &&
          e.clientX <= wsRect.right &&
          e.clientY >= wsRect.top &&
          e.clientY <= wsRect.bottom
        ) {
          if (blocks.length > 0) {
            const lastBlock = blocks[blocks.length - 1];
            if (!isDescendantOrSelf(draggingBlock, lastBlock.id)) {
              foundTarget = { blockId: lastBlock.id, targetId: lastBlock.id, position: 'after' };
            }
          } else {
            foundTarget = { blockId: null, targetId: null, position: 'root_end' };
          }
        }
      }

      setDropTarget(foundTarget);
    };

    const handlePointerUp = (event) => {
      if (!draggingBlock) return;
      // Resolve the release coordinates synchronously. React may batch the final
      // pointermove, so the rendered dropTarget can still describe an older point.
      handlePointerMove(event);
      const dropTarget = dropTargetRef.current;
      const isOverTrash = trashRef.current;

      if (isOverTrash) {
        // Dragged to trash or toolbox: delete if it was already in workspace
        if (!draggingBlock.isFromToolbox) {
          const { blocks: updated } = removeBlockFromTree(blocks, draggingBlock.id);
          onChangeBlocks?.(updated);
        }
      } else if (dropTarget) {
        // Remove block from current position if it was already in the workspace
        let cleanBlocks = blocks;
        if (!draggingBlock.isFromToolbox) {
          const res = removeBlockFromTree(blocks, draggingBlock.id);
          cleanBlocks = res.blocks;
        }

        // Construct block to insert
        const blockToInsert = {
          id: draggingBlock.id,
          type: draggingBlock.type,
          params: draggingBlock.params || {},
          children:
            draggingBlock.children ||
            (BLOCK_DEFINITIONS[draggingBlock.type]?.kind === 'c_block' ? [] : undefined),
        };

        const targetId = dropTarget.targetId || dropTarget.blockId;
        const nextBlocks = insertBlockIntoTree(
          cleanBlocks,
          targetId,
          dropTarget.position,
          blockToInsert
        );
        onChangeBlocks?.(nextBlocks);
      }
      // If dropped outside without target or trash: keep previous state safely (no accidental deletion)

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
  }, [draggingBlock, blocks, onChangeBlocks]);

  const commandCount = countCommands(blocks);
  const isLimitReached = maxCommands !== null && commandCount >= maxCommands;

  return (
    <div className="block-editor-container">
      {/* LEFT TOOLBOX */}
      <div className="block-toolbox" ref={toolboxRef}>
        <div className="toolbox-header">Blocks</div>
        <div className="toolbox-blocks-list">
          {toolboxBlockTypes.map((item, idx) => {
            const type = typeof item === 'string' ? item : item.type;
            const customParams = typeof item === 'object' && item.params ? item.params : {};
            const def = BLOCK_DEFINITIONS[type];
            if (!def) return null;
            const dummyBlock = {
              id: `toolbox_${type}_${idx}`,
              type,
              params: { ...customParams },
            };
            return (
              <div
                key={`${type}_${idx}`}
                className="toolbox-item-wrapper"
                onPointerDown={(e) => handleStartDrag(dummyBlock, e)}
              >
                <BlockRenderer compact={compact}
                  block={dummyBlock}
                  isToolbox
                  onStartDrag={(blk, e) => handleStartDrag(dummyBlock, e)}
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
            const targetId = dropTarget?.targetId || dropTarget?.blockId;
            const isTargetBefore = targetId === block.id && dropTarget?.position === 'before';
            const isTargetAfter = targetId === block.id && dropTarget?.position === 'after';

            return (
              <React.Fragment key={block.id}>
                {isTargetBefore && <div className="block-drop-indicator" />}
                <div style={{ display: 'block', marginTop: idx === 0 ? '0' : '-4px' }}>
                  <BlockRenderer compact={compact}
                    block={block}
                    activeBlockId={activeBlockId}
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
          <BlockRenderer compact={compact} block={draggingBlock} isGhost />
        </div>
      )}

      {/* TRASH ZONE INDICATOR */}
      <div
        className={`workspace-trash-zone ${
          draggingBlock && !draggingBlock.isFromToolbox ? 'visible' : ''
        } ${isOverTrash ? 'hovered' : ''}`}
        title="Drag here to delete"
      >
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </div>
    </div>
  );
}
