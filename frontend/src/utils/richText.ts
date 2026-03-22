import DOMPurify from 'dompurify';
import type { ProjectMemberSummary } from '../types/Types';
import { parseMarkdownLikeText } from './markdownParser';
import { decorateMentions, isAsciiLetter } from './mentionDecorator';

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
