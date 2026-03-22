import correctHtml from 'sanitize-html';

const htmlTagPattern = /<\/?[a-z][a-z0-9-]*(?:\s[^<>]*?)?>/i;

const allowedTags = [
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

const allowedAttributes: correctHtml.IOptions['allowedAttributes'] = {
  a: ['href', 'target', 'rel'],
};

// Accept both markdown-like plain text and sanitized HTML comments.
export const correctRichTextComment = (content: string): string => {
  const trimmed = content.trim();
  const hasHtmlTags = htmlTagPattern.test(trimmed);

  if (!hasHtmlTags) {
    return trimmed;
  }
  return correctHtml(trimmed, {
    allowedTags,
    allowedAttributes,
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: correctHtml.simpleTransform('a', {
        rel: 'noopener noreferrer',
        target: '_blank',
      }),
    },
  }).trim();
};
// Extract a normalized plain-text version for search, previews, and validation.
export const getRichTextPlainText = (content: string): string => {
  const trimmed = content.trim();
  const hasHtmlTags = htmlTagPattern.test(trimmed);

  if (!hasHtmlTags) {
    return trimmed
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return correctHtml(trimmed, {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const getRichTextNotificationSnippet = (
  content: string,
  maxLength = 120,
): string => {
  const plainText = getRichTextPlainText(content);

  if (plainText.length <= maxLength) {
    return plainText;
  }

  return `${plainText.slice(0, maxLength).trimEnd()}...`;
};
