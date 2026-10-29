import React, { useState } from 'react';
import { DEFS, toolboxFor, makeBlock } from './blockDefs.js';
import { detach, insert, removeOne, updateField, appendToMain } from './treeOps.js';

const DND = 'application/x-vp-block';

function Fields({ block, def, onField, disabled }) {
  return (def.fields || []).map((f) => {
    if (def.fixed && f.name in def.fixed) return null;
    if (f.number) {
      return <input key={f.name} className="vpb-input" type="number" min="1" max="99" value={block.fields[f.name]} disabled={disabled} onChange={(e) => onField(block.id, f.name, e.target.value)} />;
    }
    if (f.text) {
      return <input key={f.name} className="vpb-input vpb-text" value={block.fields[f.name]} disabled={disabled} onChange={(e) => onField(block.id, f.name, e.target.value)} />;
    }
    return (
      <select key={f.name} className="vpb-select" value={block.fields[f.name]} disabled={disabled} onChange={(e) => onField(block.id, f.name, e.target.value)}>
        {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    );
  });
}

function Slot({ slot, accept, children, ctx, className = '' }) {
  const [over, setOver] = useState(false);
  return (
    <div
      className={`vpb-slot vpb-slot-${accept} ${over ? 'over' : ''} ${children ? 'filled' : ''} ${className}`}
      onDragOver={(e) => { if (ctx.disabled) return; e.preventDefault(); e.stopPropagation(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setOver(false); ctx.drop(slot, accept, e); }}
    >
      {children}
    </div>
  );
}

function BlockView({ block, ctx }) {
  const def = DEFS[block.type];
  if (!def) return <div className="vpb-block" style={{ background: '#999' }}>? {block.type}</div>;
  const isValue = def.kind === 'value';
  const hat = def.kind === 'hat';
  const active = ctx.activeId === block.id;

  const body = (
    <div
      className={`vpb-block ${def.kind} ${active ? 'active' : ''}`}
      style={{ '--c': def.color }}
      draggable={!hat && !ctx.disabled}
      onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.setData(DND, JSON.stringify({ src: 'ws', id: block.id })); e.dataTransfer.effectAllowed = 'move'; }}
    >
      {isValue ? (
        <span className="vpb-inline">
          {def.infix ? (
            <>
              <Slot slot={{ parentId: block.id, kind: 'value', name: 'A' }} accept="value" ctx={ctx}>{block.values.A && <BlockView block={block.values.A} ctx={ctx} />}</Slot>
              <Fields block={block} def={def} onField={ctx.onField} disabled={ctx.disabled} />
              <Slot slot={{ parentId: block.id, kind: 'value', name: 'B' }} accept="value" ctx={ctx}>{block.values.B && <BlockView block={block.values.B} ctx={ctx} />}</Slot>
            </>
          ) : (
            <>
              {def.label && <span>{def.label}</span>}
              <Fields block={block} def={def} onField={ctx.onField} disabled={ctx.disabled} />
            </>
          )}
          {!ctx.palette && <button className="vpb-x" aria-label="remove" onClick={() => ctx.remove(block.id)}>×</button>}
        </span>
      ) : (
        <>
          <div className="vpb-head">
            {def.label && <span>{def.label}</span>}
            <Fields block={block} def={def} onField={ctx.onField} disabled={ctx.disabled} />
            {def.suffix && <span>{def.suffix}</span>}
            {(def.values || []).map((n) => (
              <Slot key={n} slot={{ parentId: block.id, kind: 'value', name: n }} accept="value" ctx={ctx} className="vpb-cond">
                {block.values[n] && <BlockView block={block.values[n]} ctx={ctx} />}
              </Slot>
            ))}
            {!hat && !ctx.palette && <button className="vpb-x" aria-label="remove" onClick={() => ctx.remove(block.id)}>×</button>}
          </div>
          {(def.statements || []).map((n, i) => (
            <React.Fragment key={n}>
              {i === 1 && def.elseLabel && <div className="vpb-else">{def.elseLabel}</div>}
              <Slot slot={{ parentId: block.id, kind: 'stmt', name: n }} accept="stmt" ctx={ctx} className="vpb-do">
                {block.statements[n] && <Chain block={block.statements[n]} ctx={ctx} />}
              </Slot>
            </React.Fragment>
          ))}
        </>
      )}
    </div>
  );
  return body;
}

function Chain({ block, ctx }) {
  const items = [];
  for (let b = block; b; b = b.next) items.push(b);
  return (
    <div className="vpb-chain">
      {items.map((b) => (
        <React.Fragment key={b.id}>
          <BlockView block={b} ctx={ctx} />
          <Slot slot={{ parentId: b.id, kind: 'next' }} accept="stmt" ctx={ctx} className="vpb-after" />
        </React.Fragment>
      ))}
    </div>
  );
}

export default function BlockEditor({ root, onChange, commands, disabled, activeId, limit }) {
  const toolbox = toolboxFor(commands);
  const used = (function count(b) { return b ? 1 + count(b.next) + Object.values(b.values).reduce((n, v) => n + count(v), 0) + Object.values(b.statements).reduce((n, v) => n + count(v), 0) : 0; })(root) - 1;
  const atLimit = limit != null && used >= limit;

  const drop = (slot, accept, e) => {
    let payload; try { payload = JSON.parse(e.dataTransfer.getData(DND)); } catch { return; }
    let stack; let base = root;
    if (payload.src === 'palette') {
      if (atLimit) return;
      stack = makeBlock(payload.type, payload.preset);
    } else {
      const d = detach(root, payload.id); stack = d.stack; base = d.root;
      if (!stack) return;
    }
    const isValue = DEFS[stack.type].kind === 'value';
    if ((accept === 'value') !== isValue) return;
    const next = insert(base, slot, stack);
    if (next) onChange(next);
  };
  const dropOnPalette = (e) => {
    e.preventDefault();
    let payload; try { payload = JSON.parse(e.dataTransfer.getData(DND)); } catch { return; }
    if (payload.src === 'ws') { const d = detach(root, payload.id); if (d.stack) onChange(d.root); }
  };
  const ctx = {
    disabled, activeId, drop,
    onField: (id, name, v) => onChange(updateField(root, id, name, v)),
    remove: (id) => onChange(removeOne(root, id)),
  };
  const paletteCtx = { ...ctx, disabled: true, palette: true };

  return (
    <div className="vpb">
      <div className="vpb-palette" onDragOver={(e) => e.preventDefault()} onDrop={dropOnPalette}>
        {toolbox.map((t, i) => {
          const block = makeBlock(t.type, t.preset); const def = DEFS[t.type];
          return (
            <div
              key={`${t.type}${i}`}
              className="vpb-pal-item"
              draggable={!disabled}
              onDragStart={(e) => { e.dataTransfer.setData(DND, JSON.stringify({ src: 'palette', type: t.type, preset: t.preset })); e.dataTransfer.effectAllowed = 'copy'; }}
              onClick={() => { if (disabled || atLimit || def.kind === 'value') return; const n = appendToMain(root, makeBlock(t.type, t.preset)); if (n) onChange(n); }}
              title={def.kind === 'value' ? 'Drag into a condition slot' : 'Drag to the workspace or click to add'}
            >
              <BlockView block={block} ctx={paletteCtx} />
            </div>
          );
        })}
      </div>
      <div className="vpb-workspace">
        <Chain block={root} ctx={ctx} />
        {limit != null && <div className="vpb-limit">Blocks: {used}/{limit}</div>}
      </div>
    </div>
  );
}
