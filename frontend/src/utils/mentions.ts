import type { ProjectMemberSummary } from '../types/Types';

const stripDiacritics = (rawText: string): string => {
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

const isAsciiLetter = (character: string) => {
  const charCode = character.charCodeAt(0);
  return (
    (charCode >= 65 && charCode <= 90) || (charCode >= 97 && charCode <= 122)
  );
};

const isDigit = (character: string) => {
  const charCode = character.charCodeAt(0);
  return charCode >= 48 && charCode <= 57;
};

const isWhitespace = (character: string) =>
  character === ' ' || character === '\n' || character === '\t';

const collapseWhitespace = (rawText: string): string => {
  let collapsedText = '';
  let lastCharacterWasWhitespace = false;

  for (const character of rawText) {
    if (isWhitespace(character)) {
      if (!lastCharacterWasWhitespace) {
        collapsedText += ' ';
      }

      lastCharacterWasWhitespace = true;
      continue;
    }

    collapsedText += character;
    lastCharacterWasWhitespace = false;
  }

  return collapsedText.trim();
};

const normalizeNameLikeText = (
  rawNameText: string,
  useDotSeparator = false,
): string => {
  let normalizedName = '';

  for (const character of collapseWhitespace(
    stripDiacritics(rawNameText),
  ).toLowerCase()) {
    const shouldKeepCharacter =
      isAsciiLetter(character) ||
      isDigit(character) ||
      character === '.' ||
      character === '_' ||
      character === '-' ||
      character === ' ';

    if (!shouldKeepCharacter) {
      continue;
    }

    normalizedName += useDotSeparator && character === ' ' ? '.' : character;
  }

  return normalizedName;
};

const removeCharacter = (
  sourceText: string,
  characterToRemove: string,
): string => {
  let filteredText = '';

  for (const character of sourceText) {
    if (character !== characterToRemove) {
      filteredText += character;
    }
  }

  return filteredText;
};

const replaceCharacter = (
  sourceText: string,
  characterToReplace: string,
  replacementText: string,
): string => {
  let transformedText = '';

  for (const character of sourceText) {
    transformedText +=
      character === characterToReplace ? replacementText : character;
  }

  return transformedText;
};

const removeLeadingAtSign = (sourceText: string): string =>
  sourceText.startsWith('@') ? sourceText.slice(1) : sourceText;

export const normalizeMentionHandle = (rawHandleText: string): string =>
  normalizeNameLikeText(rawHandleText, true);

export const getCanonicalMentionHandle = (memberName: string): string =>
  normalizeMentionHandle(memberName);

export const getMentionAliases = (memberName: string): string[] => {
  const canonicalAlias = getCanonicalMentionHandle(memberName);
  const compactAlias = normalizeMentionHandle(removeCharacter(memberName, ' '));
  const dashedAlias = replaceCharacter(
    normalizeMentionHandle(memberName),
    '.',
    '-',
  );

  return [canonicalAlias, compactAlias, dashedAlias].filter(
    (aliasText, aliasPosition, allAliases) =>
      aliasText && allAliases.indexOf(aliasText) === aliasPosition,
  );
};

export const getMentionMatch = (
  typedMentionText: string,
  projectMembers: ProjectMemberSummary[],
): ProjectMemberSummary | null => {
  const normalizedMentionAlias = normalizeMentionHandle(
    removeLeadingAtSign(typedMentionText),
  );

  if (!normalizedMentionAlias) {
    return null;
  }

  let uniqueMatchedMember: ProjectMemberSummary | null = null;

  for (const projectMember of projectMembers) {
    if (
      !getMentionAliases(projectMember.name).includes(normalizedMentionAlias)
    ) {
      continue;
    }

    if (uniqueMatchedMember && uniqueMatchedMember.id !== projectMember.id) {
      return null;
    }

    uniqueMatchedMember = projectMember;
  }

  return uniqueMatchedMember;
};

export const getMentionSuggestions = (
  typedQueryText: string,
  projectMembers: ProjectMemberSummary[],
): ProjectMemberSummary[] => {
  const normalizedQueryAlias = normalizeMentionHandle(typedQueryText);

  return projectMembers
    .filter((projectMember) => {
      const canonicalAlias = getCanonicalMentionHandle(projectMember.name);
      const normalizedMemberName = stripDiacritics(
        projectMember.name,
      ).toLowerCase();
      const normalizedEmailAddress = projectMember.email.toLowerCase();

      if (!normalizedQueryAlias) {
        return true;
      }

      return (
        canonicalAlias.includes(normalizedQueryAlias) ||
        normalizedMemberName.includes(
          replaceCharacter(normalizedQueryAlias, '.', ' '),
        ) ||
        normalizedEmailAddress.includes(normalizedQueryAlias)
      );
    })
    .sort((firstMember, secondMember) =>
      firstMember.name.localeCompare(secondMember.name),
    )
    .slice(0, 6);
};
