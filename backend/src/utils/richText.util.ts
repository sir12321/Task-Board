import correctHtml from 'sanitize-html';

const allowedTags = [
  'a',
  'b',
  'br',
  'code',
  'em',
  'i',
  'li',
  's',
  'strong',
  'u',
  'ul',
];

const allowedAttributes: correctHtml.IOptions['allowedAttributes'] = {
  a: ['href', 'target', 'rel'],
};

// Sanitize comment content. Accepts both HTML and plain markdown text.
// If content is plain text (no HTML tags), returns as-is.
// If content has HTML, sanitizes to allowed tags only.
export const correctRichTextComment = (content: string): string => {
  const trimmed = content.trim();
  
  // Check if content contains HTML tags
  const hasHtmlTags = /<[a-z][a-z0-9]*>/i.test(trimmed);
  
  if (!hasHtmlTags) {
    // Plain markdown text: return as-is, it's safe
    return trimmed;
  }
  
  // HTML content: sanitize to allowed tags
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

// Extract plain text from markdown or HTML content.
// For markdown: returns text as-is with normalized whitespace.
// For HTML: strips tags and extracts text.
export const getRichTextPlainText = (content: string): string => {
  const trimmed = content.trim();
  
  // Check if content contains HTML tags
  const hasHtmlTags = /<[a-z][a-z0-9]*>/i.test(trimmed);
  
  if (!hasHtmlTags) {
    // Plain markdown text: normalize whitespace and trim
    return trimmed
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  // HTML content: strip tags first, then normalize whitespace
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
