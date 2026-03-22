import type { ProjectMemberSummary } from '../types/Types';
import { getMentionMatch, getMentionMatches } from './mentions';

const mentionExcludedTags = new Set(['A', 'CODE']);

const mentionMinLength = 2;
const mentionMaxLength = 50;

export const isAsciiLetter = (character: string) => {
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

const getMentionTitle = (
  mentionText: string,
  members: ProjectMemberSummary[],
): string | null => {
  const uniqueMember = getMentionMatch(mentionText, members);

  if (uniqueMember) {
    return uniqueMember.email;
  }

  const matchedMembers = getMentionMatches(mentionText, members);

  if (matchedMembers.length > 1) {
    return matchedMembers
      .slice(0, 4)
      .map((member) => member.email)
      .join(' | ');
  }

  return null;
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

    const mentionTitle = getMentionTitle(mentionText, members);

    if (mentionTitle) {
      mentionNode.setAttribute('title', mentionTitle);
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

export const decorateMentions = (
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
