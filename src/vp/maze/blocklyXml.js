// Minimal Blockly-XML reader (no DOM needed, so it also runs under Node for tests).
// Produces a block tree: { type, fields:{}, values:{name:block}, statements:{name:block}, next:block|null }

function tokenize(xml) {
  const tokens = [];
  const re = /<(\/?)([a-zA-Z_:][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(xml))) {
    if (m[5] !== undefined) { tokens.push({ text: m[5] }); continue; }
    const attrs = {};
    (m[3] || '').replace(/([\w:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g, (_, k, __, a, b) => { attrs[k] = decode(a ?? b ?? ''); return ''; });
    tokens.push({ close: !!m[1], name: m[2], attrs, selfClose: !!m[4] });
  }
  return tokens;
}

function decode(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

function buildTree(xml) {
  const root = { name: '#root', attrs: {}, children: [], text: '' };
  const stack = [root];
  for (const t of tokenize(xml.replace(/<\?[\s\S]*?\?>/g, ''))) {
    const top = stack[stack.length - 1];
    if (t.text !== undefined) { top.text += decode(t.text); continue; }
    if (t.close) { stack.pop(); continue; }
    const node = { name: t.name, attrs: t.attrs, children: [], text: '' };
    top.children.push(node);
    if (!t.selfClose) stack.push(node);
  }
  return root;
}

function toBlock(node) {
  const block = { type: node.attrs.type, id: node.attrs.id, fields: {}, values: {}, statements: {}, next: null };
  for (const c of node.children) {
    if (c.name === 'field') block.fields[c.attrs.name] = c.text.trim();
    else if (c.name === 'value') { const b = c.children.find((x) => x.name === 'block' || x.name === 'shadow'); if (b) block.values[c.attrs.name] = toBlock(b); }
    else if (c.name === 'statement') { const b = c.children.find((x) => x.name === 'block'); if (b) block.statements[c.attrs.name] = toBlock(b); }
    else if (c.name === 'next') { const b = c.children.find((x) => x.name === 'block'); if (b) block.next = toBlock(b); }
  }
  return block;
}

/** Returns the list of top-level blocks found in the XML. */
export function parseBlocklyXml(xml) {
  if (!xml) return [];
  const tree = buildTree(xml);
  const xmlNode = tree.children.find((c) => c.name === 'xml') || tree;
  return xmlNode.children.filter((c) => c.name === 'block').map(toBlock);
}

/** First statement chain after the maze_start hat (or null). */
export function programFromXml(xml) {
  const tops = parseBlocklyXml(xml);
  const start = tops.find((b) => b.type === 'maze_start');
  return start ? start.next : null;
}
