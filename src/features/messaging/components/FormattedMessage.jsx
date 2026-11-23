import React from 'react';

const URL_PATTERN = /^https?:\/\/[^\s]+/i;

const findClosingMarker = (text, marker, startIndex) => {
  let cursor = startIndex;

  while (cursor < text.length) {
    const index = text.indexOf(marker, cursor);

    if (index === -1) {
      return -1;
    }

    if (index > startIndex) {
      return index;
    }

    cursor = index + marker.length;
  }

  return -1;
};

const renderInline = (value, keyPrefix = 'inline') => {
  const text = String(value || '');
  const nodes = [];
  let cursor = 0;
  let nodeIndex = 0;

  const pushText = (content) => {
    if (!content) return;

    const parts = String(content).split(/(@[A-Za-z0-9._-]{2,})/g);
    parts.forEach((part) => {
      if (!part) return;
      const isMention = /^@[A-Za-z0-9._-]{2,}$/.test(part);
      nodes.push(
        isMention ? (
          <span className="messaging-mention" key={`${keyPrefix}-mention-${nodeIndex}`}>{part}</span>
        ) : (
          <React.Fragment key={`${keyPrefix}-text-${nodeIndex}`}>{part}</React.Fragment>
        ),
      );
      nodeIndex += 1;
    });
  };

  while (cursor < text.length) {
    const remaining = text.slice(cursor);
    const urlMatch = remaining.match(URL_PATTERN);

    if (urlMatch) {
      nodes.push(
        <a
          key={`${keyPrefix}-url-${nodeIndex}`}
          href={urlMatch[0]}
          target="_blank"
          rel="noreferrer noopener"
        >
          {urlMatch[0]}
        </a>,
      );
      nodeIndex += 1;
      cursor += urlMatch[0].length;
      continue;
    }

    const linkMatch = remaining.match(
      /^\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/i,
    );

    if (linkMatch) {
      nodes.push(
        <a
          key={`${keyPrefix}-link-${nodeIndex}`}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer noopener"
        >
          {renderInline(
            linkMatch[1],
            `${keyPrefix}-link-${nodeIndex}-content`,
          )}
        </a>,
      );
      nodeIndex += 1;
      cursor += linkMatch[0].length;
      continue;
    }

    const tokens = [
      { marker: '**', type: 'strong' },
      { marker: '++', type: 'underline' },
      { marker: '~~', type: 'strike' },
      { marker: '`', type: 'code' },
      { marker: '_', type: 'italic' },
      { marker: '*', type: 'italic' },
    ];

    let tokenRendered = false;

    for (const token of tokens) {
      if (!remaining.startsWith(token.marker)) {
        continue;
      }

      if (token.marker === '*' && remaining.startsWith('**')) {
        continue;
      }

      const closingIndex = findClosingMarker(
        text,
        token.marker,
        cursor + token.marker.length,
      );

      if (closingIndex === -1) {
        continue;
      }

      const inner = text.slice(
        cursor + token.marker.length,
        closingIndex,
      );
      const key = `${keyPrefix}-${token.type}-${nodeIndex}`;
      let renderedNode = null;

      if (token.type === 'strong') {
        renderedNode = (
          <strong key={key}>{renderInline(inner, `${key}-inner`)}</strong>
        );
      } else if (token.type === 'underline') {
        renderedNode = <u key={key}>{renderInline(inner, `${key}-inner`)}</u>;
      } else if (token.type === 'strike') {
        renderedNode = (
          <del key={key}>{renderInline(inner, `${key}-inner`)}</del>
        );
      } else if (token.type === 'code') {
        renderedNode = <code key={key}>{inner}</code>;
      } else {
        renderedNode = <em key={key}>{renderInline(inner, `${key}-inner`)}</em>;
      }

      nodes.push(renderedNode);
      nodeIndex += 1;
      cursor = closingIndex + token.marker.length;
      tokenRendered = true;
      break;
    }

    if (tokenRendered) {
      continue;
    }

    const specialIndexes = [
      text.indexOf('http://', cursor + 1),
      text.indexOf('https://', cursor + 1),
      text.indexOf('[', cursor + 1),
      text.indexOf('**', cursor + 1),
      text.indexOf('++', cursor + 1),
      text.indexOf('~~', cursor + 1),
      text.indexOf('`', cursor + 1),
      text.indexOf('_', cursor + 1),
      text.indexOf('*', cursor + 1),
    ].filter((index) => index >= 0);

    const nextIndex = specialIndexes.length
      ? Math.min(...specialIndexes)
      : text.length;

    pushText(text.slice(cursor, nextIndex > cursor ? nextIndex : cursor + 1));
    cursor = nextIndex > cursor ? nextIndex : cursor + 1;
  }

  return nodes;
};

const collectCodeBlock = (lines, startIndex) => {
  const language = lines[startIndex].slice(3).trim();
  const content = [];
  let cursor = startIndex + 1;

  while (cursor < lines.length && !lines[cursor].startsWith('```')) {
    content.push(lines[cursor]);
    cursor += 1;
  }

  return {
    language,
    content: content.join('\n'),
    nextIndex: cursor < lines.length ? cursor + 1 : cursor,
  };
};

export default function FormattedMessage({ content }) {
  const lines = String(content || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (line.startsWith('```')) {
      const codeBlock = collectCodeBlock(lines, index);
      blocks.push(
        <pre key={`code-${index}`} className="messaging-rich-code-block">
          {codeBlock.language ? (
            <span className="messaging-rich-code-language">{codeBlock.language}</span>
          ) : null}
          <code>{codeBlock.content}</code>
        </pre>,
      );
      index = codeBlock.nextIndex;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines = [];
      const start = index;
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^>\s?/, ''));
        index += 1;
      }
      blocks.push(
        <blockquote key={`quote-${start}`}>
          {quoteLines.map((quoteLine, quoteIndex) => (
            <React.Fragment key={`quote-${start}-${quoteIndex}`}>
              {renderInline(quoteLine, `quote-${start}-${quoteIndex}`)}
              {quoteIndex < quoteLines.length - 1 ? <br /> : null}
            </React.Fragment>
          ))}
        </blockquote>,
      );
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items = [];
      const start = index;
      while (index < lines.length && /^[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^[-*]\s+/, ''));
        index += 1;
      }
      blocks.push(
        <ul key={`ul-${start}`}>
          {items.map((item, itemIndex) => (
            <li key={`ul-${start}-${itemIndex}`}>
              {renderInline(item, `ul-${start}-${itemIndex}`)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      const start = index;
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\d+\.\s+/, ''));
        index += 1;
      }
      blocks.push(
        <ol key={`ol-${start}`}>
          {items.map((item, itemIndex) => (
            <li key={`ol-${start}-${itemIndex}`}>
              {renderInline(item, `ol-${start}-${itemIndex}`)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    if (line.trim() === '') {
      blocks.push(<div key={`space-${index}`} className="messaging-rich-spacer" />);
      index += 1;
      continue;
    }

    const paragraphLines = [line];
    const start = index;
    index += 1;

    while (
      index < lines.length &&
      lines[index].trim() !== '' &&
      !lines[index].startsWith('```') &&
      !/^>\s?/.test(lines[index]) &&
      !/^[-*]\s+/.test(lines[index]) &&
      !/^\d+\.\s+/.test(lines[index])
    ) {
      paragraphLines.push(lines[index]);
      index += 1;
    }

    blocks.push(
      <p key={`p-${start}`}>
        {paragraphLines.map((paragraphLine, paragraphIndex) => (
          <React.Fragment key={`p-${start}-${paragraphIndex}`}>
            {renderInline(paragraphLine, `p-${start}-${paragraphIndex}`)}
            {paragraphIndex < paragraphLines.length - 1 ? <br /> : null}
          </React.Fragment>
        ))}
      </p>,
    );
  }

  return <div className="messaging-rich-message">{blocks}</div>;
}
