import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ProjectMemberSummary } from '../../../../types/Types';
import styles from './TaskDetailsModal.module.css';
import {
  getRichTextEditableText,
  getRichTextPlainText,
  renderRichText,
} from '../../../../utils/richText';
import {
  getCanonicalMentionHandle,
  getMentionSuggestions,
} from '../../../../utils/mentions';

const isMentionCharacter = (character: string) => {
  const code = character.charCodeAt(0);

  const isUppercaseLetter = code >= 65 && code <= 90;
  const isLowercaseLetter = code >= 97 && code <= 122;
  const isNumber = code >= 48 && code <= 57;

  return (
    isUppercaseLetter ||
    isLowercaseLetter ||
    isNumber ||
    character === '.' ||
    character === '_' ||
    character === '-'
  );
};

const isMentionBoundaryCharacter = (character: string | undefined) => {
  if (!character) {
    return true;
  }

  return !isMentionCharacter(character) && character !== '@';
};

const parseMentionQueryAtCaret = (textBeforeCaret: string) => {
  let index = textBeforeCaret.length - 1;

  while (index >= 0 && isMentionCharacter(textBeforeCaret[index])) {
    index -= 1;
  }

  if (index < 0 || textBeforeCaret[index] !== '@') {
    return null;
  }

  const boundaryCharacter = index > 0 ? textBeforeCaret[index - 1] : '';

  if (!isMentionBoundaryCharacter(boundaryCharacter || undefined)) {
    return null;
  }

  const query = textBeforeCaret.slice(index + 1);

  if (query.length > 50) {
    return null;
  }

  return {
    query,
    mentionStartOffset: index,
  };
};

// Normalize browser-specific whitespace before storing markdown-like comment text.
const parseComposerText = (rawText: string): string =>
  rawText
    .replace(/\u00a0/g, ' ')
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n');

export interface TaskCommentComposerHandle {
  startEditing: (id: string, content: string) => void;
  reset: (resetEditState?: boolean) => void;
}

interface TaskCommentComposerProps {
  mentionSourceMembers: ProjectMemberSummary[];
  onAddComment?: (content: string) => Promise<void> | void;
  onEditComment?: (
    commentId: string,
    newContent: string,
  ) => Promise<void> | void;
  showMessage: (msg: string) => void;
}

export const TaskCommentComposer = forwardRef<
  TaskCommentComposerHandle,
  TaskCommentComposerProps
>(({ mentionSourceMembers, onAddComment, onEditComment, showMessage }, ref) => {
  const hintId = 'comment-composer-hint';
  const mentionMenuId = 'comment-mention-menu';
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [isMentionMenuOpen, setIsMentionMenuOpen] = useState(false);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);
  // Keep composer text local so typing stays responsive even if submit handlers are async.
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCommentEmpty =
    getRichTextPlainText(
      renderRichText(newComment, mentionSourceMembers),
    ).trim().length === 0;

  const mentionSuggestions = useMemo(
    () => getMentionSuggestions(mentionQuery, mentionSourceMembers),
    [mentionQuery, mentionSourceMembers],
  );

  const [editComment, setEditComment] = useState(false);
  const [editCommentId, setEditCommentId] = useState<string | null>(null);

  const getCaretOffsetInEditor = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();

    if (!editor || !selection || selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);

    if (!editor.contains(range.startContainer)) {
      return null;
    }

    const beforeCaretRange = range.cloneRange();
    beforeCaretRange.selectNodeContents(editor);
    beforeCaretRange.setEnd(range.startContainer, range.startOffset);

    return parseComposerText(beforeCaretRange.toString()).length;
  };

  const setCaretOffsetInEditor = (targetOffset: number) => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    const selection = window.getSelection();

    if (!selection) {
      return;
    }

    const range = document.createRange();
    let remainingOffset = targetOffset;
    let positioned = false;

    const textWalker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let currentNode = textWalker.nextNode();

    while (currentNode) {
      const textNode = currentNode as Text;
      const textLength = textNode.data.length;

      if (remainingOffset <= textLength) {
        range.setStart(textNode, remainingOffset);
        positioned = true;
        break;
      }

      remainingOffset -= textLength;
      currentNode = textWalker.nextNode();
    }

    if (!positioned) {
      range.selectNodeContents(editor);
      range.collapse(false);
    } else {
      range.collapse(true);
    }

    selection.removeAllRanges();
    selection.addRange(range);
  };

  const setComposerContent = (
    content: string,
    options?: { forceDomSync?: boolean },
  ) => {
    const editor = editorRef.current;
    // Avoid clobbering live edits unless we are intentionally forcing the DOM to resync.
    if (
      editor &&
      (options?.forceDomSync === true || document.activeElement !== editor)
    ) {
      editor.textContent = content;
    }
    setNewComment(content);
  };

  const syncMentionState = (value: string, caretOffset: number) => {
    const mentionMatch = parseMentionQueryAtCaret(value.slice(0, caretOffset));

    if (!mentionMatch) {
      setMentionQuery('');
      setIsMentionMenuOpen(false);
      setActiveMentionIndex(0);
      return;
    }

    setMentionQuery(mentionMatch.query);
    setIsMentionMenuOpen(true);
    setActiveMentionIndex(0);
  };

  const insertMention = (member: ProjectMemberSummary) => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    const caretOffset = getCaretOffsetInEditor();

    if (caretOffset === null) {
      return;
    }

    const textBeforeCaret = newComment.slice(0, caretOffset);
    const mentionMatch = parseMentionQueryAtCaret(textBeforeCaret);

    if (!mentionMatch) {
      return;
    }

    const mentionText = `@${getCanonicalMentionHandle(member.name)} `;
    const replacementStart = mentionMatch.mentionStartOffset;
    const updatedComment = `${newComment.slice(0, replacementStart)}${mentionText}${newComment.slice(caretOffset)}`;
    const nextCaretPosition = replacementStart + mentionText.length;

    setComposerContent(updatedComment, { forceDomSync: true });

    setIsMentionMenuOpen(false);
    setMentionQuery('');
    setActiveMentionIndex(0);

    requestAnimationFrame(() => {
      editor.focus();
      setCaretOffsetInEditor(nextCaretPosition);
    });
  };

  const resetComposer = (resetEditState = false) => {
    setComposerContent('');
    setIsMentionMenuOpen(false);
    setMentionQuery('');
    setActiveMentionIndex(0);

    if (resetEditState) {
      setEditComment(false);
      setEditCommentId(null);
    }
  };

  const handleAddComment = async () => {
    const content = newComment;

    if (
      getRichTextPlainText(renderRichText(content, mentionSourceMembers)).trim()
        .length === 0
    )
      return;

    if (editComment && editCommentId) {
      if (!onEditComment) {
        return;
      }

      try {
        setIsSubmitting(true);
        await onEditComment(editCommentId, content);
        resetComposer(true);
      } catch {
        showMessage('Failed to edit comment.');
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    if (!onAddComment) {
      resetComposer();
      return;
    }

    try {
      setIsSubmitting(true);
      await onAddComment(content);
      resetComposer();
    } catch {
      showMessage('Failed to add comment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useImperativeHandle(ref, () => ({
    startEditing: (id: string, content: string) => {
      const plainTextContent = getRichTextEditableText(content);

      setEditComment(true);
      setEditCommentId(id);
      setComposerContent(plainTextContent);
      setIsMentionMenuOpen(false);
      setMentionQuery('');
      setActiveMentionIndex(0);

      requestAnimationFrame(() => {
        editorRef.current?.focus();
        setCaretOffsetInEditor(plainTextContent.length);
      });
    },
    reset: resetComposer,
  }));

  return (
    <div className={styles.commentComposer}>
      <div
        ref={editorRef}
        className={styles.commentInput}
        contentEditable="plaintext-only"
        role="textbox"
        aria-multiline="true"
        aria-label="Write a markdown comment"
        aria-describedby={hintId}
        aria-expanded={isMentionMenuOpen}
        aria-controls={isMentionMenuOpen ? mentionMenuId : undefined}
        data-placeholder="Write a comment"
        suppressContentEditableWarning
        onInput={(event) => {
          const value = parseComposerText(event.currentTarget.innerText);
          const caretOffset = getCaretOffsetInEditor() ?? value.length;
          setComposerContent(value);
          syncMentionState(value, caretOffset);
        }}
        onClick={(event) =>
          syncMentionState(
            parseComposerText(event.currentTarget.innerText),
            getCaretOffsetInEditor() ??
              parseComposerText(event.currentTarget.innerText).length,
          )
        }
        onKeyUp={() => {
          const value = parseComposerText(editorRef.current?.innerText ?? '');
          syncMentionState(value, getCaretOffsetInEditor() ?? value.length);
        }}
        onKeyDown={(event) => {
          if (
            isMentionMenuOpen &&
            mentionSuggestions.length > 0 &&
            event.key === 'ArrowDown'
          ) {
            event.preventDefault();
            setActiveMentionIndex((currentIndex) =>
              Math.min(currentIndex + 1, mentionSuggestions.length - 1),
            );
            return;
          }

          if (
            isMentionMenuOpen &&
            mentionSuggestions.length > 0 &&
            event.key === 'ArrowUp'
          ) {
            event.preventDefault();
            setActiveMentionIndex((currentIndex) =>
              Math.max(currentIndex - 1, 0),
            );
            return;
          }

          if (
            isMentionMenuOpen &&
            mentionSuggestions.length > 0 &&
            (event.key === 'Enter' || event.key === 'Tab')
          ) {
            event.preventDefault();
            insertMention(mentionSuggestions[activeMentionIndex]);
            return;
          }

          if (event.key === 'Escape') {
            setIsMentionMenuOpen(false);
            return;
          }

          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault();
            void handleAddComment();
          }
        }}
      />
      {isMentionMenuOpen && mentionSuggestions.length > 0 && (
        <div className={styles.mentionMenu} id={mentionMenuId} role="listbox">
          {mentionSuggestions.map((member, memberIndex) => (
            <button
              key={member.id}
              type="button"
              className={`${styles.mentionOption} ${
                memberIndex === activeMentionIndex
                  ? styles.mentionOptionActive
                  : ''
              }`}
              onMouseDown={(event) => {
                event.preventDefault();
                insertMention(member);
              }}
              role="option"
              aria-selected={memberIndex === activeMentionIndex}
            >
              <span className={styles.mentionOptionName}>
                @{getCanonicalMentionHandle(member.name)}
              </span>
              <span className={styles.mentionOptionMeta}>
                {member.name} · {member.email}
              </span>
            </button>
          ))}
        </div>
      )}
      <div className={styles.commentHint} id={hintId}>
        Use Markdown: **bold**, *italic*, __underline__, ~~strike~~, `inline
        code`, [links](https://example.com), lists with - item or 1. item. Type
        @ to mention collaborators.
      </div>
      <div className={styles.commentActions}>
        <button
          type="button"
          className={styles.addCommentButton}
          onClick={handleAddComment}
          disabled={isSubmitting || isCommentEmpty}
        >
          {isSubmitting ? 'Adding…' : 'Add comment'}
        </button>
      </div>
    </div>
  );
});

TaskCommentComposer.displayName = 'TaskCommentComposer';
