import DOMPurify from 'dompurify';
import type { ProjectMemberSummary } from '../types/Types';
import { getMentionMatch } from './mentions';

const ALLOWED_TAGS = [
  'a',
  'b',
  'blockquote',
  'br',
  'code',
  'div',
  'em',
  'i',
  'li',
  'ol',
  'p',
  'pre',
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

const mentionExcludedTags = new Set(['A', 'CODE', 'PRE']);

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

const parseInlineMarkdown = (value: string): string => {
  let index = 0;
  let output = '';

  while (index < value.length) {
    if (value.startsWith('**', index)) {
      const closeIndex = findNext(value, '**', index + 2);

      if (closeIndex > index + 2) {
        const innerValue = value.slice(index + 2, closeIndex);
        output += `<strong>${parseInlineMarkdown(innerValue)}</strong>`;
        index = closeIndex + 2;
        continue;
      }
    }

    if (value.startsWith('__', index)) {
      const closeIndex = findNext(value, '__', index + 2);

      if (closeIndex > index + 2) {
        const innerValue = value.slice(index + 2, closeIndex);
        output += `<u>${parseInlineMarkdown(innerValue)}</u>`;
        index = closeIndex + 2;
        continue;
      }
    }

    if (value.startsWith('~~', index)) {
      const closeIndex = findNext(value, '~~', index + 2);

      if (closeIndex > index + 2) {
        const innerValue = value.slice(index + 2, closeIndex);
        output += `<s>${parseInlineMarkdown(innerValue)}</s>`;
        index = closeIndex + 2;
        continue;
      }
    }

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

const getOrderedListMarkerLength = (line: string): number => {
  let index = 0;

  while (index < line.length && isDigit(line[index])) {
    index += 1;
  }

  if (index === 0 || line[index] !== '.' || line[index + 1] !== ' ') {
    return 0;
  }

  return index + 2;
};

const parseMarkdownLikeText = (content: string): string => {
  const lines = normalizeLineBreaks(content).split('\n');
  const blocks: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const rawLine = lines[index];
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith('```')) {
      const codeLines: string[] = [];
      index += 1;

      while (
        index < lines.length &&
        !lines[index].trimStart().startsWith('```')
      ) {
        codeLines.push(lines[index]);
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      blocks.push(
        `<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`,
      );
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: string[] = [];

      while (index < lines.length) {
        const listLine = lines[index].trim();

        if (!(listLine.startsWith('- ') || listLine.startsWith('* '))) {
          break;
        }

        items.push(`<li>${parseInlineMarkdown(listLine.slice(2).trim())}</li>`);
        index += 1;
      }

      blocks.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    const orderedMarkerLength = getOrderedListMarkerLength(line);

    if (orderedMarkerLength > 0) {
      const items: string[] = [];

      while (index < lines.length) {
        const orderedLine = lines[index].trim();
        const markerLength = getOrderedListMarkerLength(orderedLine);

        if (markerLength === 0) {
          break;
        }

        items.push(
          `<li>${parseInlineMarkdown(orderedLine.slice(markerLength).trim())}</li>`,
        );
        index += 1;
      }

      blocks.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];

      while (index < lines.length && lines[index].trim().startsWith('> ')) {
        quoteLines.push(parseInlineMarkdown(lines[index].trim().slice(2)));
        index += 1;
      }

      blocks.push(`<blockquote>${quoteLines.join('<br />')}</blockquote>`);
      continue;
    }

    const paragraphLines: string[] = [];

    while (index < lines.length) {
      const paragraphLine = lines[index].trimEnd();

      if (!paragraphLine.trim()) {
        break;
      }

      if (
        paragraphLine.trimStart().startsWith('```') ||
        paragraphLine.trimStart().startsWith('- ') ||
        paragraphLine.trimStart().startsWith('* ') ||
        paragraphLine.trimStart().startsWith('> ') ||
        getOrderedListMarkerLength(paragraphLine.trimStart()) > 0
      ) {
        break;
      }

      paragraphLines.push(parseInlineMarkdown(paragraphLine));
      index += 1;
    }

    blocks.push(`<p>${paragraphLines.join('<br />')}</p>`);
  }

  return blocks.join('');
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

  const text = container.textContent ?? '';
  let output = '';
  let previousWasWhitespace = true;

  for (const character of text) {
    const normalizedCharacter = character === '\u00a0' ? ' ' : character;
    const isWhitespace =
      normalizedCharacter === ' ' ||
      normalizedCharacter === '\n' ||
      normalizedCharacter === '\t';

    if (isWhitespace) {
      if (!previousWasWhitespace) {
        output += ' ';
      }

      previousWasWhitespace = true;
      continue;
    }

    output += normalizedCharacter;
    previousWasWhitespace = false;
  }

  return output.trim();
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
