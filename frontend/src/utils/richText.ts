import DOMPurify from 'dompurify';
import type { ProjectMemberSummary } from '../types/Types';
import { getMentionMatch } from './mentions';

const ALLOWED_TAGS = [
  'a',
  'b',
  'br',
  'code',
  'em',
  'i',
  'li',
  'ol',
  's',
  'strong',
  'u',
  'ul',
];

const ALLOWED_ATTR = ['href', 'target', 'rel'];

export const correctRichText = (content: string): string =>
  DOMPurify.sanitize(content, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  }).trim();

const mentionExcludedTags = new Set(['A', 'CODE']);

const mentionMinLength = 2;
const mentionMaxLength = 50;

const isAsciiLetter = (character: string) => {
  const code = character.charCodeAt(0);
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
};

const isDigit = (character: string) => {
  const code = character.charCodeAt(0);
  return code >= 48 && code <= 57;
};

const isMentionCharacter = (character: string) =>
  isAsciiLetter(character) ||
  isDigit(character) ||
  character === '.' ||
  character === '_' ||
  character === '-';

const isBoundaryCharacter = (character: string | undefined) => {
  if (!character) {
    return true;
  }

  return !isMentionCharacter(character) && character !== '@';
};

const escapeHtml = (content: string): string => {
  const container = document.createElement('div');
  container.textContent = content;
  return container.innerHTML;
};

const normalizeLineBreaks = (content: string) =>
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

// Parse inline markdown markers: **bold**, *italic*, __underline__, ~~strike~~, `code`, [links]
// Strategy: check for multi-char markers first (**,__,~~) to avoid conflicts,
// then single-char markers (*,`,[), then escape plain text.
// Recursively parses inner content to support nesting (e.g., ***bold italic***).
const parseInlineMarkdown = (value: string): string => {
  let index = 0;
  let output = '';

  while (index < value.length) {
    // ** = bold/strong (highest priority, 2-char marker)
    if (value.startsWith('**', index)) {
      const closeIndex = findNext(value, '**', index + 2);

      if (closeIndex > index + 2) {
        const innerValue = value.slice(index + 2, closeIndex);
        output += `<strong>${parseInlineMarkdown(innerValue)}</strong>`;
        index = closeIndex + 2;
        continue;
      }
    }

    // __ = underline (2-char marker)
    if (value.startsWith('__', index)) {
      const closeIndex = findNext(value, '__', index + 2);

      if (closeIndex > index + 2) {
        const innerValue = value.slice(index + 2, closeIndex);
        output += `<u>${parseInlineMarkdown(innerValue)}</u>`;
        index = closeIndex + 2;
        continue;
      }
    }

    // ~~ = strikethrough (2-char marker)
    if (value.startsWith('~~', index)) {
      const closeIndex = findNext(value, '~~', index + 2);

      if (closeIndex > index + 2) {
        const innerValue = value.slice(index + 2, closeIndex);
        output += `<s>${parseInlineMarkdown(innerValue)}</s>`;
        index = closeIndex + 2;
        continue;
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
        output += `<em>${parseInlineMarkdown(innerValue)}</em>`;
        index = closeIndex + 1;
        continue;
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

const parseMarkdownLikeText = (content: string): string => {
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

const hasHtmlTags = (content: string): boolean => {
  for (let index = 0; index < content.length; index += 1) {
    if (content[index] !== '<') {
      continue;
    }

    const nextCharacter = content[index + 1];

    if (!nextCharacter) {
      return false;
    }

    if (nextCharacter === '/') {
      const nameCharacter = content[index + 2];
      if (nameCharacter && isAsciiLetter(nameCharacter)) {
        return true;
      }

      continue;
    }

    if (isAsciiLetter(nextCharacter)) {
      return true;
    }
  }

  return false;
};

const appendMentionDecoratedText = (
  textValue: string,
  members: ProjectMemberSummary[],
): DocumentFragment => {
  const fragment = document.createDocumentFragment();
  let index = 0;
  let lastPlainStart = 0;

  while (index < textValue.length) {
    if (textValue[index] !== '@') {
      index += 1;
      continue;
    }

    const previousCharacter = index > 0 ? textValue[index - 1] : undefined;

    if (!isBoundaryCharacter(previousCharacter)) {
      index += 1;
      continue;
    }

    let mentionEnd = index + 1;

    while (
      mentionEnd < textValue.length &&
      isMentionCharacter(textValue[mentionEnd])
    ) {
      mentionEnd += 1;
    }

    const mentionHandle = textValue.slice(index + 1, mentionEnd);

    if (
      mentionHandle.length < mentionMinLength ||
      mentionHandle.length > mentionMaxLength
    ) {
      index = mentionEnd;
      continue;
    }

    if (lastPlainStart < index) {
      fragment.append(textValue.slice(lastPlainStart, index));
    }

    const mentionText = `@${mentionHandle}`;
    const mentionNode = document.createElement('span');
    mentionNode.className = 'rich-text-mention';
    mentionNode.textContent = mentionText;

    const matchedMember = getMentionMatch(mentionText, members);

    if (matchedMember) {
      mentionNode.setAttribute(
        'title',
        `${matchedMember.name} (${matchedMember.email})`,
      );
    }

    fragment.append(mentionNode);

    index = mentionEnd;
    lastPlainStart = mentionEnd;
  }

  if (lastPlainStart < textValue.length) {
    fragment.append(textValue.slice(lastPlainStart));
  }

  return fragment;
};

const decorateMentions = (
  content: string,
  members: ProjectMemberSummary[] = [],
): string => {
  const template = document.createElement('template');
  template.innerHTML = content;

  const visitNode = (node: Node) => {
    Array.from(node.childNodes).forEach((childNode) => {
      if (childNode.nodeType === Node.ELEMENT_NODE) {
        const element = childNode as HTMLElement;

        if (mentionExcludedTags.has(element.tagName)) {
          return;
        }

        visitNode(childNode);
        return;
      }

      if (childNode.nodeType !== Node.TEXT_NODE) {
        return;
      }

      const textValue = childNode.textContent ?? '';

      if (!textValue.includes('@')) {
        return;
      }

      const fragment = appendMentionDecoratedText(textValue, members);

      if (!fragment.childNodes.length) {
        return;
      }

      childNode.parentNode?.replaceChild(fragment, childNode);
    });
  };

  visitNode(template.content);

  return template.innerHTML;
};

export const getRichTextPlainText = (content: string): string => {
  const container = document.createElement('div');
  container.innerHTML = correctRichText(content);

  return (container.textContent ?? '')
    .replace(/\u00a0/g, ' ')
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n');
};

const normalizeEditableText = (value: string): string =>
  value
    .replace(/\u00a0/g, ' ')
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const getNodeTextForComposer = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const element = node as HTMLElement;

  if (element.tagName === 'BR') {
    return '\n';
  }

  let output = '';

  Array.from(element.childNodes).forEach((childNode) => {
    output += getNodeTextForComposer(childNode);
  });

  return output;
};

const getListItemTextForComposer = (element: HTMLElement): string =>
  getNodeTextForComposer(element).replace(/\s+/g, ' ').trim();

const getBlockTextForComposer = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const element = node as HTMLElement;

  if (element.tagName === 'UL' || element.tagName === 'OL') {
    const listItems = Array.from(element.children).filter(
      (childNode) => childNode.tagName === 'LI',
    ) as HTMLElement[];

    const lines = listItems
      .map((listItem, listIndex) => {
        const itemText = getListItemTextForComposer(listItem);

        if (!itemText) {
          return '';
        }

        if (element.tagName === 'OL') {
          return `${listIndex + 1}. ${itemText}`;
        }

        return `- ${itemText}`;
      })
      .filter(Boolean);

    return lines.join('\n');
  }

  if (element.tagName === 'BR') {
    return '\n';
  }

  return getNodeTextForComposer(element);
};

export const getRichTextEditableText = (content: string): string => {
  if (!hasHtmlTags(content)) {
    return normalizeEditableText(content);
  }

  const container = document.createElement('div');
  container.innerHTML = correctRichText(content);

  const blocks = Array.from(container.childNodes)
    .map((childNode) => getBlockTextForComposer(childNode))
    .filter((value) => value.trim().length > 0);

  return normalizeEditableText(blocks.join('\n'));
};

export const renderRichText = (
  content: string,
  members: ProjectMemberSummary[] = [],
): string => {
  if (!hasHtmlTags(content)) {
    return decorateMentions(parseMarkdownLikeText(content), members);
  }

  return decorateMentions(correctRichText(content), members);
};
