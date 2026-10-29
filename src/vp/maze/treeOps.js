// Immutable operations on the editor's block tree.
const clone = (b) => (b ? { ...b, values: { ...b.values }, statements: { ...b.statements } } : b);

/** Remove block `id` together with everything chained after it. Returns { root, stack } (stack null if not found). */
export function detach(root, id) {
  let stack = null;
  const walk = (b) => {
    if (!b) return b;
    const c = clone(b);
    if (c.next && c.next.id === id) { stack = c.next; c.next = null; return c; }
    for (const k of Object.keys(c.statements)) {
      if (c.statements[k]?.id === id) { stack = c.statements[k]; delete c.statements[k]; return c; }
    }
    for (const k of Object.keys(c.values)) {
      if (c.values[k]?.id === id) { stack = c.values[k]; delete c.values[k]; return c; }
    }
    c.next = walk(c.next);
    for (const k of Object.keys(c.statements)) c.statements[k] = walk(c.statements[k]);
    for (const k of Object.keys(c.values)) c.values[k] = walk(c.values[k]);
    return c;
  };
  const r = walk(root);
  return { root: r, stack };
}

export function contains(b, id) {
  if (!b) return false;
  if (b.id === id) return true;
  return contains(b.next, id) || Object.values(b.statements).some((s) => contains(s, id)) || Object.values(b.values).some((v) => contains(v, id));
}

const lastOf = (b) => { let c = b; while (c.next) c = c.next; return c; };

/** Insert stack at slot { parentId, kind: 'next'|'stmt'|'value', name }. Returns new root or null if the parent is missing. */
export function insert(root, slot, stack) {
  let done = false;
  const walk = (b) => {
    if (!b) return b;
    const c = clone(b);
    if (c.id === slot.parentId) {
      done = true;
      if (slot.kind === 'next') { const rest = c.next; const s = clone(stack); const tail = copyChain(s); tail.last.next = rest; c.next = tail.first; }
      else if (slot.kind === 'stmt') { const rest = c.statements[slot.name]; const tail = copyChain(stack); tail.last.next = rest || null; c.statements[slot.name] = tail.first; }
      else { c.values[slot.name] = { ...stack, next: null }; }
      return c;
    }
    c.next = walk(c.next);
    for (const k of Object.keys(c.statements)) c.statements[k] = walk(c.statements[k]);
    for (const k of Object.keys(c.values)) c.values[k] = walk(c.values[k]);
    return c;
  };
  const r = walk(root);
  return done ? r : null;
}

function copyChain(b) {
  const first = clone(b); let cur = first;
  while (cur.next) { cur.next = clone(cur.next); cur = cur.next; }
  return { first, last: cur };
}

export function updateField(root, id, name, value) {
  const walk = (b) => {
    if (!b) return b;
    const c = clone(b);
    if (c.id === id) c.fields = { ...c.fields, [name]: value };
    c.next = walk(c.next);
    for (const k of Object.keys(c.statements)) c.statements[k] = walk(c.statements[k]);
    for (const k of Object.keys(c.values)) c.values[k] = walk(c.values[k]);
    return c;
  };
  return walk(root);
}

export function appendToMain(root, stack) {
  return insert(root, { parentId: lastOfMain(root).id, kind: 'next' }, stack);
}
function lastOfMain(root) { return lastOf(root); }

/** Remove just block `id` (its following blocks stay attached). Nested statement/value children are dropped with it. */
export function removeOne(root, id) {
  const walk = (b) => {
    if (!b) return b;
    const c = clone(b);
    if (c.next && c.next.id === id) c.next = c.next.next;
    for (const k of Object.keys(c.statements)) if (c.statements[k]?.id === id) { const n = c.statements[k].next; if (n) c.statements[k] = n; else delete c.statements[k]; }
    for (const k of Object.keys(c.values)) if (c.values[k]?.id === id) delete c.values[k];
    c.next = walk(c.next);
    for (const k of Object.keys(c.statements)) c.statements[k] = walk(c.statements[k]);
    for (const k of Object.keys(c.values)) c.values[k] = walk(c.values[k]);
    return c;
  };
  return walk(root);
}
