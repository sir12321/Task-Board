export const escapeHtml = (content: string): string => {
  const container = document.createElement('div');
  container.textContent = content;
  return container.innerHTML;
};

export const normalizeLineBreaks = (content: string) =>
  content.replaceAll('\r\n', '\n').replaceAll('\r', '\n');

const isSafeLink = (url: string) => {
  const normalized = url.trim().toLowerCase();
  return (
    normalized.startsWith('http://') ||
    normalized.startsWith('https://') ||
    normalized.startsWith('mailto:')
  );
};

const findNext = (value: string, token: string, start: number) => {
  const index = value.indexOf(token, start);
  return index >= 0 ? index : -1;
};

const hasValidInlineWrapperContent = (value: string) =>
  /^\S(?:[\s\S]*\S)?$/.test(value);

// Parse inline markdown markers: **bold**, *italic*, __underline__, ~~strike~~, `code`, [links]
// Strategy: check for multi-char markers first (**,__,~~) to avoid conflicts,
// then single-char markers (*,`,[), then escape plain text.
// Recursively parses inner content to support nesting (e.g., ***bold italic***).
export const parseInlineMarkdown = (value: string): string => {
  let index = 0;
  let output = '';

  while (index < value.length) {
    // ** = bold/strong (highest priority, 2-char marker)
    if (value.startsWith('**', index)) {
      const closeIndex = findNext(value, '**', index + 2);

      if (closeIndex > index + 2) {
        const innerValue = value.slice(index + 2, closeIndex);

        if (hasValidInlineWrapperContent(innerValue)) {
          output += `<strong>${parseInlineMarkdown(innerValue)}</strong>`;
          index = closeIndex + 2;
          continue;
        }
      }
    }

    // __ = underline (2-char marker)
    if (value.startsWith('__', index)) {
      const closeIndex = findNext(value, '__', index + 2);

      if (closeIndex > index + 2) {
        const innerValue = value.slice(index + 2, closeIndex);

        if (hasValidInlineWrapperContent(innerValue)) {
          output += `<u>${parseInlineMarkdown(innerValue)}</u>`;
          index = closeIndex + 2;
          continue;
        }
      }
    }

    // ~~ = strikethrough (2-char marker)
    if (value.startsWith('~~', index)) {
      const closeIndex = findNext(value, '~~', index + 2);

      if (closeIndex > index + 2) {
        const innerValue = value.slice(index + 2, closeIndex);

        if (hasValidInlineWrapperContent(innerValue)) {
          output += `<s>${parseInlineMarkdown(innerValue)}</s>`;
          index = closeIndex + 2;
          continue;
        }
      }
    }

    // ` = inline code (single char, no recursive parsing of inner content)
    if (value[index] === '`') {
      const closeIndex = findNext(value, '`', index + 1);

      if (closeIndex > index + 1) {
        output += `<code>${escapeHtml(
          value.slice(index + 1, closeIndex),
        )}</code>`;
        index = closeIndex + 1;
        continue;
      }
    }

    if (value[index] === '*') {
      const closeIndex = findNext(value, '*', index + 1);

      if (closeIndex > index + 1) {
        const innerValue = value.slice(index + 1, closeIndex);

        if (hasValidInlineWrapperContent(innerValue)) {
          output += `<em>${parseInlineMarkdown(innerValue)}</em>`;
          index = closeIndex + 1;
          continue;
        }
      }
    }

    if (value[index] === '[') {
      const labelCloseIndex = findNext(value, ']', index + 1);

      if (labelCloseIndex > index + 1 && value[labelCloseIndex + 1] === '(') {
        const urlCloseIndex = findNext(value, ')', labelCloseIndex + 2);

        if (urlCloseIndex > labelCloseIndex + 2) {
          const label = value.slice(index + 1, labelCloseIndex);
          const url = value.slice(labelCloseIndex + 2, urlCloseIndex).trim();

          if (isSafeLink(url)) {
            output += `<a href="${escapeHtml(
              url,
            )}" target="_blank" rel="noopener noreferrer">${parseInlineMarkdown(
              label,
            )}</a>`;
          } else {
            output += escapeHtml(value.slice(index, urlCloseIndex + 1));
          }

          index = urlCloseIndex + 1;
          continue;
        }
      }
    }

    output += escapeHtml(value[index]);
    index += 1;
  }

  return output;
};

export const parseMarkdownLikeText = (content: string): string => {
  const lines = normalizeLineBreaks(content).split('\n');
  const output: string[] = [];
  let index = 0;

  const isUnorderedListLine = (line: string) =>
    line.startsWith('- ') || line.startsWith('* ');

  const isOrderedListLine = (line: string) => /^\d+\.\s+/.test(line);

  while (index < lines.length) {
    const line = lines[index].trimEnd();

    if (!line.trim()) {
      index += 1;
      continue;
    }

    // Unordered list: - or *
    if (isUnorderedListLine(line.trim())) {
      const items: string[] = [];

      while (index < lines.length) {
        const nextLine = lines[index].trim();
        if (!isUnorderedListLine(nextLine)) {
          break;
        }
        items.push(`<li>${parseInlineMarkdown(nextLine.slice(2).trim())}</li>`);
        index += 1;
      }

      output.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    // Ordered list: 1. item, 2. item, ...
    if (isOrderedListLine(line.trim())) {
      const items: string[] = [];

      while (index < lines.length) {
        const nextLine = lines[index].trim();
        if (!isOrderedListLine(nextLine)) {
          break;
        }

        const markerMatch = nextLine.match(/^\d+\.\s+/);
        const itemText = markerMatch
          ? nextLine.slice(markerMatch[0].length).trim()
          : nextLine;

        items.push(`<li>${parseInlineMarkdown(itemText)}</li>`);
        index += 1;
      }

      output.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    // Regular line with inline formatting. Wrap in a block element so
    // authored newlines are preserved visually instead of collapsing to spaces.
    output.push(`<div>${parseInlineMarkdown(line)}</div>`);
    index += 1;
  }

  return output.join('');
};
