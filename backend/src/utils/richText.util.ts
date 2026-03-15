import correctHtml from 'sanitize-html';

const allowedTags = [
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

const allowedAttributes: correctHtml.IOptions['allowedAttributes'] = {
  a: ['href', 'target', 'rel'],
};

export const correctRichTextComment = (content: string): string =>
  correctHtml(content, {
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

export const getRichTextPlainText = (content: string): string =>
  correctHtml(content, {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

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
