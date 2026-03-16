import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  ProjectMemberSummary,
  Task as Task,
  ProjectRole as ProjectRole,
} from '../../../../types/Types';
import styles from './TaskDetailsModal.module.css';
import { getInitials } from '../../../../utils/getInitials';
import {
  getRichTextPlainText,
  renderRichText,
  correctRichText,
} from '../../../../utils/richText';
import {
  getCanonicalMentionHandle,
  getMentionSuggestions,
} from '../../../../utils/mentions';

const toolbarButtons = [
  { label: 'B', title: 'Bold', command: 'bold' },
  { label: 'I', title: 'Italic', command: 'italic' },
  { label: 'U', title: 'Underline', command: 'underline' },
  { label: 'S', title: 'Strikethrough', command: 'strikeThrough' },
  { label: '•', title: 'Bulleted list', command: 'insertUnorderedList' },
  { label: '1.', title: 'Numbered list', command: 'insertOrderedList' },
] as const;

const defaultToolbarState = {
  bold: false,
  italic: false,
  underline: false,
  strikeThrough: false,
  insertUnorderedList: false,
  insertOrderedList: false,
  blockquote: false,
  pre: false,
  link: false,
};

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

const isWhitespace = (character: string) =>
  character === ' ' || character === '\n' || character === '\t';

const parseMentionQueryAtCaret = (textBeforeCaret: string) => {
  let index = textBeforeCaret.length - 1;

  while (index >= 0 && isMentionCharacter(textBeforeCaret[index])) {
    index -= 1;
  }

  if (index < 0 || textBeforeCaret[index] !== '@') {
    return null;
  }

  const boundaryCharacter = index > 0 ? textBeforeCaret[index - 1] : '';

  if (
    boundaryCharacter &&
    !isWhitespace(boundaryCharacter) &&
    boundaryCharacter !== '('
  ) {
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

/**
 * Props for the TaskDetailsModal component.
 * - `userRole`: role of the current user in the project (may affect actions)
 * - `task`: task object with all details to display
 * - `onClose`: callback to close the modal
 * - `onDelete`: optional delete handler for this task
 */
interface Properties {
  userRole: ProjectRole;
  task: Task;
  projectMembers: ProjectMemberSummary[];
  mentionableMembers?: ProjectMemberSummary[];
  currentUserId?: string | null;
  currentUserGlobalRole?: string;
  onClose: () => void;
  onAddComment?: (content: string) => Promise<void> | void;
  onDeleteComment?: (commentId: string) => Promise<void> | void;
}

/**
 * TaskDetailsModal
 * Displays detailed information about a task in a modal overlay,
 * including title, status, description, activity/comments and metadata
 * such as assignee, reporter, priority, created/due dates and parent.
 */
const TaskDetailsModal = ({
  userRole,
  task,
  projectMembers,
  mentionableMembers,
  currentUserId,
  currentUserGlobalRole,
  onClose,

  onAddComment,
  onDeleteComment,
}: Properties) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [isMentionMenuOpen, setIsMentionMenuOpen] = useState(false);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);
  const [activeToolbarState, setActiveToolbarState] =
    useState(defaultToolbarState);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'In progress';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    // Use UTC to avoid timezone shifting for dates stored at noon UTC
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  };

  const assigneeName = task.assigneeName || 'Unassigned';
  const reporterName = task.reporterName || 'Unassigned';
  // Use lowercased type as a CSS class key (matches module CSS entries).
  const taskTypeClass = task.type.toLowerCase();

  // Local state used for composing a new comment. This keeps the UI
  // responsive even when a parent-provided `onAddComment` is async.
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const commentDeleteWindowMs = 2 * 24 * 60 * 60 * 1000;
  const isCommentEmpty = getRichTextPlainText(newComment) === '';
  const mentionSourceMembers = mentionableMembers ?? projectMembers;
  const mentionSuggestions = useMemo(
    () => getMentionSuggestions(mentionQuery, mentionSourceMembers),
    [mentionQuery, mentionSourceMembers],
  );

  const getMentionContext = () => {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    const anchorNode = selection.anchorNode;

    if (!anchorNode || !editorRef.current?.contains(anchorNode)) {
      return null;
    }

    if (anchorNode.nodeType !== Node.TEXT_NODE) {
      return null;
    }

    const textNode = anchorNode as Text;
    const offset = selection.anchorOffset;
    const textBeforeCaret = textNode.data.slice(0, offset);
    const mentionMatch = parseMentionQueryAtCaret(textBeforeCaret);

    if (!mentionMatch) {
      return null;
    }

    const query = mentionMatch.query;
    const mentionStartOffset = mentionMatch.mentionStartOffset;

    const mentionRange = document.createRange();
    mentionRange.setStart(textNode, mentionStartOffset);
    mentionRange.setEnd(textNode, offset);

    return {
      query,
      range: mentionRange,
    };
  };

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  const isSelectionInsideEditor = () => {
    const selection = window.getSelection();
    const editor = editorRef.current;

    if (!selection || !editor) {
      return false;
    }

    const anchorNode = selection.anchorNode;
    const focusNode = selection.focusNode;

    return Boolean(
      anchorNode &&
      focusNode &&
      editor.contains(anchorNode) &&
      editor.contains(focusNode),
    );
  };

  const hasAncestorTag = (tagName: string) => {
    const selection = window.getSelection();
    const editor = editorRef.current;

    if (!selection || !editor || !isSelectionInsideEditor()) {
      return false;
    }

    let currentNode: Node | null = selection.anchorNode;

    while (currentNode && currentNode !== editor) {
      if (
        currentNode.nodeType === Node.ELEMENT_NODE &&
        (currentNode as HTMLElement).tagName === tagName
      ) {
        return true;
      }

      currentNode = currentNode.parentNode;
    }

    return false;
  };

  const getCommandState = (command: string) => {
    if (!isSelectionInsideEditor()) {
      return false;
    }

    try {
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  };

  const refreshToolbarState = () => {
    if (!isSelectionInsideEditor()) {
      setActiveToolbarState(defaultToolbarState);
      return;
    }

    setActiveToolbarState({
      bold: getCommandState('bold'),
      italic: getCommandState('italic'),
      underline: getCommandState('underline'),
      strikeThrough: getCommandState('strikeThrough'),
      insertUnorderedList: getCommandState('insertUnorderedList'),
      insertOrderedList: getCommandState('insertOrderedList'),
      blockquote: hasAncestorTag('BLOCKQUOTE'),
      pre: hasAncestorTag('PRE'),
      link: hasAncestorTag('A'),
    });
  };

  const syncEditorState = () => {
    setNewComment(correctRichText(editorRef.current?.innerHTML ?? ''));
    refreshToolbarState();

    const mentionContext = getMentionContext();

    if (!mentionContext) {
      setMentionQuery('');
      setIsMentionMenuOpen(false);
      setActiveMentionIndex(0);
      return;
    }

    setMentionQuery(mentionContext.query);
    setIsMentionMenuOpen(true);
    setActiveMentionIndex(0);
  };

  const runEditorCommand = (command: string, value?: string) => {
    focusEditor();
    document.execCommand(command, false, value);
    syncEditorState();
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      refreshToolbarState();
    };

    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  const handleCreateLink = () => {
    const url = window.prompt('Enter a URL');

    if (!url) {
      return;
    }

    runEditorCommand('createLink', url);
  };

  const insertMention = (member: ProjectMemberSummary) => {
    const mentionContext = getMentionContext();

    if (!mentionContext) {
      return;
    }

    const selection = window.getSelection();
    const mentionNode = document.createTextNode(
      `@${getCanonicalMentionHandle(member.name)} `,
    );

    mentionContext.range.deleteContents();
    mentionContext.range.insertNode(mentionNode);

    const caretRange = document.createRange();
    caretRange.setStartAfter(mentionNode);
    caretRange.collapse(true);

    selection?.removeAllRanges();
    selection?.addRange(caretRange);

    setIsMentionMenuOpen(false);
    setMentionQuery('');
    setActiveMentionIndex(0);
    syncEditorState();
    focusEditor();
  };

  const handleAddComment = async () => {
    const content = correctRichText(editorRef.current?.innerHTML ?? newComment);

    if (getRichTextPlainText(content) === '') return;

    if (!onAddComment) {
      // to be removed in future when onAddComment is guaranteed to be provided
      console.log('New comment:', content);
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
      setNewComment('');
      setIsMentionMenuOpen(false);
      setMentionQuery('');
      return;
    }
    try {
      setIsSubmitting(true);
      await onAddComment(content);
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
      setNewComment('');
      setIsMentionMenuOpen(false);
      setMentionQuery('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // Clicking the overlay closes the modal. The inner modal stops
    // propagation so clicks inside do not close it unintentionally.
    <div className={styles['overall-modal']} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles['close-btn']} onClick={onClose}>
          ✕
        </button>

        <div className={styles.container}>
          <div className={styles.content}>
            <div className={styles.headerRow}>
              <h2 className={styles.title}>{task.title}</h2>
              <div className={styles.headerMeta}>
                <div className={styles.status}>{task.columnName}</div>
                <div className={`${styles.typeBadge} ${styles[taskTypeClass]}`}>
                  {task.type}
                </div>
              </div>
            </div>

            {/* Task description with sensible fallback */}
            <p className={styles.description}>
              {task.description || 'No description'}
            </p>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Activity</h3>
              <div className={styles.commentList}>
                {task.comments && task.comments.length > 0 ? (
                  task.comments.map((c) => {
                    const isMine = c.authorId === currentUserId;
                    const isGlobalAdmin =
                      currentUserGlobalRole === 'GLOBAL_ADMIN';
                    const createdAtMs = new Date(c.createdAt).getTime();
                    const isWithinDeleteWindow =
                      Number.isFinite(createdAtMs) &&
                      Date.now() - createdAtMs <= commentDeleteWindowMs;
                    const canDelete =
                      Boolean(onDeleteComment) &&
                      (isGlobalAdmin || (isMine && isWithinDeleteWindow));
                    return (
                      <div
                        className={`${styles.comment} ${
                          isMine ? styles.commentMine : ''
                        }`}
                        key={c.id}
                      >
                        <div className={styles.commentAvatar}>
                          {getInitials(c.authorName)}
                        </div>
                        <div className={styles.commentBody}>
                          <div className={styles.commentMeta}>
                            <strong>{c.authorName}</strong> · {/*bold*/}
                            <span className={styles.commentTime}>
                              {new Date(c.createdAt).toLocaleString()}
                            </span>
                            {canDelete && (
                              <button
                                type="button"
                                className={styles.commentDeleteButton}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      'Are you sure you want to delete this comment?',
                                    )
                                  ) {
                                    onDeleteComment?.(c.id);
                                  }
                                }}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                          <div
                            className={styles.commentText}
                            dangerouslySetInnerHTML={{
                              __html: renderRichText(c.content, projectMembers),
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className={styles.activityPlaceholder}>
                    No comments yet.
                  </div>
                )}
              </div>

              {userRole !== 'PROJECT_VIEWER' && (
                <div className={styles.commentComposer}>
                  <div className={styles.commentToolbar}>
                    {toolbarButtons.map((button) => (
                      <button
                        key={button.command}
                        type="button"
                        className={`${styles.toolbarButton} ${
                          activeToolbarState[
                            button.command as keyof typeof activeToolbarState
                          ]
                            ? styles.toolbarButtonActive
                            : ''
                        }`}
                        title={button.title}
                        aria-label={button.title}
                        aria-pressed={
                          activeToolbarState[
                            button.command as keyof typeof activeToolbarState
                          ]
                        }
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => runEditorCommand(button.command)}
                      >
                        {button.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      className={`${styles.toolbarButton} ${
                        activeToolbarState.blockquote
                          ? styles.toolbarButtonActive
                          : ''
                      }`}
                      title="Quote"
                      aria-label="Quote"
                      aria-pressed={activeToolbarState.blockquote}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() =>
                        runEditorCommand('formatBlock', 'blockquote')
                      }
                    >
                      "
                    </button>
                    <button
                      type="button"
                      className={`${styles.toolbarButton} ${
                        activeToolbarState.pre ? styles.toolbarButtonActive : ''
                      }`}
                      title="Code block"
                      aria-label="Code block"
                      aria-pressed={activeToolbarState.pre}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => runEditorCommand('formatBlock', 'pre')}
                    >
                      {'</>'}
                    </button>
                    <button
                      type="button"
                      className={`${styles.toolbarButton} ${
                        activeToolbarState.link
                          ? styles.toolbarButtonActive
                          : ''
                      }`}
                      title="Insert link"
                      aria-label="Insert link"
                      aria-pressed={activeToolbarState.link}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={handleCreateLink}
                    >
                      Link
                    </button>
                    <button
                      type="button"
                      className={styles.toolbarButton}
                      title="Clear formatting"
                      aria-label="Clear formatting"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => runEditorCommand('removeFormat')}
                    >
                      Clear
                    </button>
                  </div>
                  <div
                    ref={editorRef}
                    className={styles.commentInput}
                    contentEditable
                    role="textbox"
                    aria-label="Write a rich text comment"
                    aria-multiline="true"
                    data-placeholder="Write a comment..."
                    suppressContentEditableWarning
                    onInput={syncEditorState}
                    onPaste={(event) => {
                      event.preventDefault();
                      const pastedText =
                        event.clipboardData.getData('text/plain');
                      document.execCommand('insertText', false, pastedText);
                      syncEditorState();
                    }}
                    onKeyDown={(event) => {
                      if (
                        isMentionMenuOpen &&
                        mentionSuggestions.length > 0 &&
                        event.key === 'ArrowDown'
                      ) {
                        event.preventDefault();
                        setActiveMentionIndex((currentIndex) =>
                          Math.min(
                            currentIndex + 1,
                            mentionSuggestions.length - 1,
                          ),
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

                      if (
                        (event.metaKey || event.ctrlKey) &&
                        event.key === 'Enter'
                      ) {
                        event.preventDefault();
                        void handleAddComment();
                      }
                    }}
                  />
                  {isMentionMenuOpen && mentionSuggestions.length > 0 && (
                    <div className={styles.mentionMenu}>
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
                  <div className={styles.commentHint}>
                    Type @ to mention a project collaborator (admins/members
                    only). Suggestions show email while selecting.
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
              )}
            </section>
          </div>

          <aside className={styles.sidebar}>
            <div className={styles.sidebarCard}>
              <div className={styles.rowBetween}>
                <div>
                  <div className={styles.smallLabel}>Assignee</div>
                  {assigneeName ? (
                    <div
                      className={styles.assigneeRow}
                      title={`Assignee: ${assigneeName}`}
                    >
                      <div className={styles.avatarSmall}>
                        {getInitials(assigneeName)}
                      </div>
                      <div className={styles.assigneeName}>{assigneeName}</div>
                    </div>
                  ) : (
                    <div className={styles.detailValue}>Unassigned</div>
                  )}
                </div>
              </div>

              <div className={styles.rowBetween}>
                <div>
                  <div className={styles.smallLabel}>Reporter</div>
                  {reporterName ? (
                    <div
                      className={styles.assigneeRow}
                      title={`Reporter: ${reporterName}`}
                    >
                      <div className={styles.avatarSmall}>
                        {getInitials(reporterName)}
                      </div>
                      <div className={styles.assigneeName}>{reporterName}</div>
                    </div>
                  ) : (
                    <div className={styles.detailValue}>Unassigned</div>
                  )}
                </div>
              </div>

              <div className={styles.detailRow}>
                <div className={styles.detailLabel}>Priority</div>
                <div className={styles.detailValue}>{task.priority}</div>
              </div>

              <div className={styles.detailRow}>
                <div className={styles.detailLabel}>Status</div>
                <div className={styles.detailValue}>
                  {task.type === 'STORY' ? task.status : task.columnName}
                </div>
              </div>

              <div className={styles.detailRow}>
                <div className={styles.detailLabel}>Created on</div>
                <div className={styles.detailValue}>
                  {formatDate(task.createdAt)}
                </div>
              </div>

              <div className={styles.detailRow}>
                <div className={styles.detailLabel}>Updated on</div>
                <div className={styles.detailValue}>
                  {formatDate(task.updatedAt)}
                </div>
              </div>

              <div className={styles.detailRow}>
                <div className={styles.detailLabel}>Due date</div>
                <div className={styles.detailValue}>
                  {formatDate(task.dueDate)}
                </div>
              </div>

              <div className={styles.detailRow}>
                <div className={styles.detailLabel}>Resolved on</div>
                <div className={styles.detailValue}>
                  {formatDate(task.resolvedAt || null)}
                </div>
              </div>

              <div className={styles.detailRow}>
                <div className={styles.detailLabel}>Closed on</div>
                <div className={styles.detailValue}>
                  {formatDate(task.closedAt || null)}
                </div>
              </div>

              <div className={styles.detailRow}>
                <div className={styles.detailLabel}>Parent</div>
                <div className={styles.detailValue}>
                  {task.parentName || 'None'}
                </div>
              </div>

              {/* Only show delete button when user has sufficient role and a
                  delete handler is provided. The parent component handles
                  any error reporting for deletions. */}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailsModal;
