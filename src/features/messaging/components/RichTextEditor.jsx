import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';

const MAX_MESSAGE_LENGTH = 4000;
const ZERO_WIDTH_PATTERN = /\u200B/g;

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const isSafeUrl = (value) => /^https?:\/\//i.test(String(value || '').trim());

const renderInlineMarkupToHtml = (value) => {
  const text = String(value || '');
  let cursor = 0;
  let html = '';

  const appendPlainUntil = (nextIndex) => {
    const plain = text.slice(cursor, nextIndex);
    html += escapeHtml(plain).replace(/\n/g, '<br>');
    cursor = nextIndex;
  };

  while (cursor < text.length) {
    const remaining = text.slice(cursor);
    const linkMatch = remaining.match(/^\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/i);

    if (linkMatch) {
      html += `<a href="${escapeHtml(linkMatch[2])}" target="_blank" rel="noreferrer noopener">${renderInlineMarkupToHtml(linkMatch[1])}</a>`;
      cursor += linkMatch[0].length;
      continue;
    }

    const tokenDefinitions = [
      { marker: '**', tag: 'strong' },
      { marker: '++', tag: 'u' },
      { marker: '~~', tag: 's' },
      { marker: '`', tag: 'code', literal: true },
      { marker: '_', tag: 'em' },
      { marker: '*', tag: 'em' },
    ];

    let matched = false;

    for (const token of tokenDefinitions) {
      if (!remaining.startsWith(token.marker)) {
        continue;
      }

      if (token.marker === '*' && remaining.startsWith('**')) {
        continue;
      }

      const closingIndex = text.indexOf(
        token.marker,
        cursor + token.marker.length,
      );

      if (closingIndex <= cursor + token.marker.length) {
        continue;
      }

      const inner = text.slice(
        cursor + token.marker.length,
        closingIndex,
      );
      const renderedInner = token.literal
        ? escapeHtml(inner)
        : renderInlineMarkupToHtml(inner);

      html += `<${token.tag}>${renderedInner}</${token.tag}>`;
      cursor = closingIndex + token.marker.length;
      matched = true;
      break;
    }

    if (matched) {
      continue;
    }

    const nextTokenIndexes = [
      text.indexOf('**', cursor + 1),
      text.indexOf('++', cursor + 1),
      text.indexOf('~~', cursor + 1),
      text.indexOf('`', cursor + 1),
      text.indexOf('_', cursor + 1),
      text.indexOf('*', cursor + 1),
      text.indexOf('[', cursor + 1),
    ].filter((index) => index >= 0);

    const nextIndex = nextTokenIndexes.length
      ? Math.min(...nextTokenIndexes)
      : text.length;

    appendPlainUntil(nextIndex > cursor ? nextIndex : cursor + 1);
  }

  return html;
};

export const markupToEditorHtml = (content) => {
  if (!String(content || '')) {
    return '';
  }

  const lines = String(content || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (line.startsWith('```')) {
      const codeLines = [];
      index += 1;

      while (index < lines.length && !lines[index].startsWith('```')) {
        codeLines.push(lines[index]);
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      blocks.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines = [];

      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^>\s?/, ''));
        index += 1;
      }

      blocks.push(
        `<blockquote>${quoteLines
          .map((quoteLine) => renderInlineMarkupToHtml(quoteLine))
          .join('<br>')}</blockquote>`,
      );
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const listItems = [];

      while (index < lines.length && /^[-*]\s+/.test(lines[index])) {
        listItems.push(lines[index].replace(/^[-*]\s+/, ''));
        index += 1;
      }

      blocks.push(
        `<ul>${listItems
          .map((item) => `<li>${renderInlineMarkupToHtml(item)}</li>`)
          .join('')}</ul>`,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const listItems = [];

      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        listItems.push(lines[index].replace(/^\d+\.\s+/, ''));
        index += 1;
      }

      blocks.push(
        `<ol>${listItems
          .map((item) => `<li>${renderInlineMarkupToHtml(item)}</li>`)
          .join('')}</ol>`,
      );
      continue;
    }

    if (line.trim() === '') {
      blocks.push('<div><br></div>');
      index += 1;
      continue;
    }

    const paragraphLines = [line];
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
      `<div>${paragraphLines
        .map((paragraphLine) => renderInlineMarkupToHtml(paragraphLine))
        .join('<br>')}</div>`,
    );
  }

  return blocks.join('');
};

const serializeInlineNode = (node) => {
  if (!node) {
    return '';
  }

  if (node.nodeType === Node.TEXT_NODE) {
    return String(node.nodeValue || '')
      .replace(/\u00a0/g, ' ')
      .replace(ZERO_WIDTH_PATTERN, '');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const element = node;
  const tagName = element.tagName.toLowerCase();
  const children = Array.from(element.childNodes)
    .map(serializeInlineNode)
    .join('');

  switch (tagName) {
    case 'br':
      return '\n';
    case 'strong':
    case 'b':
      return children ? `**${children}**` : '';
    case 'em':
    case 'i':
      return children ? `_${children}_` : '';
    case 'u':
      return children ? `++${children}++` : '';
    case 's':
    case 'strike':
    case 'del':
      return children ? `~~${children}~~` : '';
    case 'code':
      return element.parentElement?.tagName.toLowerCase() === 'pre'
        ? element.textContent || ''
        : children
          ? `\`${children}\``
          : '';
    case 'a': {
      const href = element.getAttribute('href') || '';
      return isSafeUrl(href) && children
        ? `[${children}](${href})`
        : children;
    }
    default:
      return children;
  }
};

const serializeBlockNode = (node, orderedIndex = 1) => {
  if (!node) {
    return '';
  }

  if (node.nodeType === Node.TEXT_NODE) {
    return serializeInlineNode(node);
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const element = node;
  const tagName = element.tagName.toLowerCase();

  if (tagName === 'pre') {
    return `\`\`\`\n${element.textContent || ''}\n\`\`\``;
  }

  if (tagName === 'blockquote') {
    const content = Array.from(element.childNodes)
      .map(serializeInlineNode)
      .join('')
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n');

    return content;
  }

  if (tagName === 'ul' || tagName === 'ol') {
    return Array.from(element.children)
      .filter((child) => child.tagName.toLowerCase() === 'li')
      .map((child, index) => {
        const prefix = tagName === 'ol' ? `${orderedIndex + index}. ` : '- ';
        return `${prefix}${Array.from(child.childNodes)
          .map(serializeInlineNode)
          .join('')}`;
      })
      .join('\n');
  }

  if (tagName === 'div' || tagName === 'p') {
    return Array.from(element.childNodes).map(serializeInlineNode).join('');
  }

  if (tagName === 'br') {
    return '';
  }

  return serializeInlineNode(element);
};

export const editorToMarkup = (editor) => {
  if (!editor) {
    return '';
  }

  const blocks = Array.from(editor.childNodes).map((node) =>
    serializeBlockNode(node),
  );

  return blocks
    .join('\n')
    .replace(/\u00a0/g, ' ')
    .replace(ZERO_WIDTH_PATTERN, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+|\n+$/g, '');
};

const isRangeInside = (range, element) => {
  if (!range || !element) {
    return false;
  }

  const container = range.commonAncestorContainer;
  return container === element || element.contains(container);
};

const getSelectionElement = (selection) => {
  if (!selection?.rangeCount) {
    return null;
  }

  const node = selection.getRangeAt(0).startContainer;
  return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
};

const selectionIsInsideBlock = (selection, editor, selector) => {
  const element = getSelectionElement(selection);
  const matchingBlock = element?.closest?.(selector);

  return Boolean(matchingBlock && editor?.contains(matchingBlock));
};

const RichTextEditor = forwardRef(function RichTextEditor(
  {
    value,
    onChange,
    placeholder,
    compact = false,
    onSubmit,
    disabled = false,
    onSelectionChange,
    onPasteFiles,
  },
  forwardedRef,
) {
  const editorRef = useRef(null);
  const savedRangeRef = useRef(null);
  const lastValidHtmlRef = useRef('');

  useImperativeHandle(
    forwardedRef,
    () => ({
      focus: () => editorRef.current?.focus(),
      getElement: () => editorRef.current,
      rememberSelection: () => {
        const selection = window.getSelection();
        const range = selection?.rangeCount ? selection.getRangeAt(0) : null;

        if (isRangeInside(range, editorRef.current)) {
          savedRangeRef.current = range.cloneRange();
        }
      },
      restoreSelection: () => {
        const range = savedRangeRef.current;

        if (!range || !editorRef.current) {
          return false;
        }

        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        editorRef.current.focus();
        return true;
      },
      insertText: (text) => {
        const editor = editorRef.current;
        if (!editor) return;

        editor.focus();
        const selection = window.getSelection();
        const range = savedRangeRef.current;

        if (range && isRangeInside(range, editor)) {
          selection.removeAllRanges();
          selection.addRange(range);
        }

        const activeRange = selection.rangeCount
          ? selection.getRangeAt(0)
          : document.createRange();

        if (!selection.rangeCount) {
          activeRange.selectNodeContents(editor);
          activeRange.collapse(false);
          selection.addRange(activeRange);
        }

        activeRange.deleteContents();
        const textNode = document.createTextNode(text);
        activeRange.insertNode(textNode);
        activeRange.setStartAfter(textNode);
        activeRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(activeRange);
        savedRangeRef.current = activeRange.cloneRange();

        editor.dispatchEvent(new InputEvent('input', { bubbles: true }));
      },
      applyCommand: (command, commandValue = null) => {
        const editor = editorRef.current;
        if (!editor) return;

        editor.focus();
        const range = savedRangeRef.current;
        const selection = window.getSelection();

        if (range && isRangeInside(range, editor)) {
          selection.removeAllRanges();
          selection.addRange(range);
        }

        document.execCommand(command, false, commandValue);
        editor.dispatchEvent(new InputEvent('input', { bubbles: true }));

        if (selection.rangeCount) {
          savedRangeRef.current = selection.getRangeAt(0).cloneRange();
        }
      },
      wrapInline: (tagName, fallbackText = '') => {
        const editor = editorRef.current;
        if (!editor) return;

        editor.focus();
        const selection = window.getSelection();
        const savedRange = savedRangeRef.current;

        if (savedRange && isRangeInside(savedRange, editor)) {
          selection.removeAllRanges();
          selection.addRange(savedRange);
        }

        const range = selection.rangeCount
          ? selection.getRangeAt(0)
          : document.createRange();

        if (!selection.rangeCount) {
          range.selectNodeContents(editor);
          range.collapse(false);
          selection.addRange(range);
        }

        const wrapper = document.createElement(tagName);
        const extracted = range.extractContents();

        if (extracted.textContent) {
          wrapper.appendChild(extracted);
        } else {
          wrapper.textContent = fallbackText;
        }

        range.insertNode(wrapper);
        range.selectNodeContents(wrapper);
        selection.removeAllRanges();
        selection.addRange(range);
        savedRangeRef.current = range.cloneRange();
        editor.dispatchEvent(new InputEvent('input', { bubbles: true }));
      },
      insertLink: (url, label) => {
        const editor = editorRef.current;
        if (!editor || !isSafeUrl(url)) return;

        editor.focus();
        const selection = window.getSelection();
        const savedRange = savedRangeRef.current;

        if (savedRange && isRangeInside(savedRange, editor)) {
          selection.removeAllRanges();
          selection.addRange(savedRange);
        }

        const range = selection.rangeCount
          ? selection.getRangeAt(0)
          : document.createRange();

        if (!selection.rangeCount) {
          range.selectNodeContents(editor);
          range.collapse(false);
          selection.addRange(range);
        }

        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.target = '_blank';
        anchor.rel = 'noreferrer noopener';

        const extracted = range.extractContents();
        if (extracted.textContent) {
          anchor.appendChild(extracted);
        } else {
          anchor.textContent = label || url;
        }

        range.insertNode(anchor);
        range.selectNodeContents(anchor);
        selection.removeAllRanges();
        selection.addRange(range);
        savedRangeRef.current = range.cloneRange();
        editor.dispatchEvent(new InputEvent('input', { bubbles: true }));
      },
    }),
    [],
  );

  const rememberSelection = useCallback(() => {
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;

    if (isRangeInside(range, editorRef.current)) {
      savedRangeRef.current = range.cloneRange();
      onSelectionChange?.();
    }
  }, [onSelectionChange]);

  const syncMarkup = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const nextValue = editorToMarkup(editor);

    if (nextValue.length > MAX_MESSAGE_LENGTH) {
      editor.innerHTML = lastValidHtmlRef.current;
      return;
    }

    lastValidHtmlRef.current = editor.innerHTML;
    onChange(nextValue);
    rememberSelection();
  }, [onChange, rememberSelection]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const currentValue = editorToMarkup(editor);
    const normalizedValue = String(value || '');

    if (currentValue !== normalizedValue) {
      const nextHtml = markupToEditorHtml(normalizedValue);
      editor.innerHTML = nextHtml;
      lastValidHtmlRef.current = nextHtml;
    }
  }, [value]);

  return (
    <div
      ref={editorRef}
      className={`messaging-rich-editor ${compact ? 'messaging-rich-editor--compact' : ''}`}
      contentEditable={!disabled}
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      aria-label={placeholder}
      data-placeholder={placeholder}
      onInput={syncMarkup}
      onMouseUp={rememberSelection}
      onKeyUp={rememberSelection}
      onFocus={rememberSelection}
      onPaste={(event) => {
        const clipboardFiles = Array.from(event.clipboardData?.items || [])
          .filter((item) => item.kind === 'file')
          .map((item) => item.getAsFile())
          .filter(Boolean);

        if (clipboardFiles.length > 0) {
          event.preventDefault();
          onPasteFiles?.(clipboardFiles);

          const plainText = event.clipboardData.getData('text/plain');
          if (plainText) {
            document.execCommand('insertText', false, plainText);
          }
          return;
        }

        event.preventDefault();
        const plainText = event.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, plainText);
      }}
      onKeyDown={(event) => {
        if (
          event.key !== 'Enter' ||
          event.shiftKey ||
          event.nativeEvent.isComposing
        ) {
          return;
        }

        const editor = editorRef.current;
        const selection = window.getSelection();
        const selectionElement = getSelectionElement(selection);
        const listItem = selectionElement?.closest?.('li');
        const list = listItem?.parentElement;
        const isListItemInsideEditor = Boolean(
          listItem &&
          list &&
          editor?.contains(listItem) &&
          ['ol', 'ul'].includes(list.tagName.toLowerCase()),
        );

        if (isListItemInsideEditor && selection?.rangeCount) {
          event.preventDefault();

          const activeRange = selection.getRangeAt(0);

          // Remove any selected content before splitting the list item.
          if (!activeRange.collapsed) {
            activeRange.deleteContents();
          }

          const splitRange = document.createRange();
          splitRange.setStart(
            activeRange.startContainer,
            activeRange.startOffset,
          );
          splitRange.setEnd(listItem, listItem.childNodes.length);

          const trailingContent = splitRange.extractContents();
          const nextListItem = document.createElement('li');

          if (trailingContent.childNodes.length > 0) {
            nextListItem.appendChild(trailingContent);
          }

          const currentText = String(listItem.textContent || '')
            .replace(ZERO_WIDTH_PATTERN, '')
            .trim();
          const nextText = String(nextListItem.textContent || '')
            .replace(ZERO_WIDTH_PATTERN, '')
            .trim();

          if (!currentText && listItem.childNodes.length === 0) {
            listItem.appendChild(document.createElement('br'));
          }

          if (!nextText && nextListItem.childNodes.length === 0) {
            nextListItem.appendChild(document.createElement('br'));
          }

          listItem.insertAdjacentElement('afterend', nextListItem);

          const nextRange = document.createRange();
          nextRange.selectNodeContents(nextListItem);
          nextRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(nextRange);
          savedRangeRef.current = nextRange.cloneRange();

          syncMarkup();
          rememberSelection();
          return;
        }

        const shouldContinueStructuredBlock =
          selectionIsInsideBlock(selection, editor, 'blockquote') ||
          selectionIsInsideBlock(selection, editor, 'pre');

        if (shouldContinueStructuredBlock) {
          window.requestAnimationFrame(() => {
            syncMarkup();
            rememberSelection();
          });
          return;
        }

        event.preventDefault();
        onSubmit?.();
      }}
    />
  );
});

export default RichTextEditor;
