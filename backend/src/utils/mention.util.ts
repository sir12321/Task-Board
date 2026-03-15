import prisma from './prisma';
import { getRichTextPlainText } from './richText.util';

const mentionMinLength = 2;
const mentionMaxLength = 50;

const isAsciiLetter = (character: string) => {
  const charCode = character.charCodeAt(0);
  return (charCode >= 65 && charCode <= 90) || (charCode >= 97 && charCode <= 122);
};

const isDigit = (character: string) => {
  const charCode = character.charCodeAt(0);
  return charCode >= 48 && charCode <= 57;
};

const isMentionCharacter = (character: string) =>
  isAsciiLetter(character) ||
  isDigit(character) ||
  character === '.' ||
  character === '_' ||
  character === '-';

const isBoundaryCharacter = (leftNeighborCharacter: string | undefined) => {
  if (!leftNeighborCharacter) {
    return true;
  }

  return !isMentionCharacter(leftNeighborCharacter) && leftNeighborCharacter !== '@';
};

const collapseWhitespaceToSeparator = (
  sourceText: string,
  separator: string,
) => {
  let collapsedText = '';
  let lastCharacterWasWhitespace = false;

  for (const character of sourceText) {
    const isWhitespace = character === ' ' || character === '\n' || character === '\t';

    if (isWhitespace) {
      if (!lastCharacterWasWhitespace) {
        collapsedText += separator;
      }

      lastCharacterWasWhitespace = true;
      continue;
    }

    collapsedText += character;
    lastCharacterWasWhitespace = false;
  }

  if (collapsedText.startsWith(separator)) {
    collapsedText = collapsedText.slice(separator.length);
  }

  if (collapsedText.endsWith(separator)) {
    collapsedText = collapsedText.slice(0, -separator.length);
  }

  return collapsedText;
};

const stripDiacritics = (rawText: string) => {
  let cleanedText = '';

  for (const character of rawText.normalize('NFKD')) {
    const charCode = character.charCodeAt(0);

    if (charCode >= 0x0300 && charCode <= 0x036f) {
      continue;
    }

    cleanedText += character;
  }

  return cleanedText;
};

const normalizeMentionHandle = (rawHandleText: string): string =>
  Array.from(stripDiacritics(rawHandleText).toLowerCase())
    .filter((character) => isMentionCharacter(character))
    .join('');

const getMentionAliases = (memberName: string): string[] => {
  const trimmedMemberName = memberName.trim();
  const compactAliasSource = collapseWhitespaceToSeparator(
    trimmedMemberName,
    '',
  );
  const dottedAliasSource = collapseWhitespaceToSeparator(
    trimmedMemberName,
    '.',
  );
  const dashedAliasSource = collapseWhitespaceToSeparator(
    trimmedMemberName,
    '-',
  );

  return [
    normalizeMentionHandle(compactAliasSource),
    normalizeMentionHandle(dottedAliasSource),
    normalizeMentionHandle(dashedAliasSource),
  ].filter(
    (aliasText, aliasPosition, allAliases) =>
      aliasText && allAliases.indexOf(aliasText) === aliasPosition,
  );
};

const parseMentionHandles = (plainTextContent: string): string[] => {
  const collectedHandles = new Set<string>();
  let cursorIndex = 0;

  while (cursorIndex < plainTextContent.length) {
    if (plainTextContent[cursorIndex] !== '@') {
      cursorIndex += 1;
      continue;
    }

    const leftNeighborCharacter =
      cursorIndex > 0 ? plainTextContent[cursorIndex - 1] : undefined;

    if (!isBoundaryCharacter(leftNeighborCharacter)) {
      cursorIndex += 1;
      continue;
    }

    let mentionEndIndex = cursorIndex + 1;

    while (
      mentionEndIndex < plainTextContent.length &&
      isMentionCharacter(plainTextContent[mentionEndIndex])
    ) {
      mentionEndIndex += 1;
    }

    const rawHandle = plainTextContent.slice(cursorIndex + 1, mentionEndIndex);

    if (
      rawHandle.length >= mentionMinLength &&
      rawHandle.length <= mentionMaxLength
    ) {
      const normalizedHandle = normalizeMentionHandle(rawHandle);

      if (normalizedHandle) {
        collectedHandles.add(normalizedHandle);
      }
    }

    cursorIndex = mentionEndIndex;
  }

  return Array.from(collectedHandles);
};

export const extractMentionHandles = (content: string): string[] => {
  const plainTextContent = getRichTextPlainText(content);
  return parseMentionHandles(plainTextContent);
};

export const resolveMentionedUserIds = async (
  content: string,
  projectId: string,
): Promise<string[]> => {
  const extractedMentionHandles = extractMentionHandles(content);

  if (extractedMentionHandles.length === 0) {
    return [];
  }

  const projectMembers = await prisma.projectMember.findMany({
    where: { projectId },
    select: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  const aliasToUserIdMap = new Map<string, string | null>();

  for (const memberRecord of projectMembers) {
    for (const aliasText of getMentionAliases(memberRecord.user.name)) {
      if (!aliasToUserIdMap.has(aliasText)) {
        aliasToUserIdMap.set(aliasText, memberRecord.user.id);
        continue;
      }

      const existingUserId = aliasToUserIdMap.get(aliasText);

      if (existingUserId !== memberRecord.user.id) {
        aliasToUserIdMap.set(aliasText, null);
      }
    }
  }

  const resolvedMentionedUserIds = new Set<string>();

  for (const handleText of extractedMentionHandles) {
    const userId = aliasToUserIdMap.get(handleText);

    if (userId) {
      resolvedMentionedUserIds.add(userId);
    }
  }

  return Array.from(resolvedMentionedUserIds);
};
