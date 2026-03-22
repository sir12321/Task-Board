import type { Board as BoardType } from '../../../types/Types';
import { getStoryColumnId, getTaskStatus } from './workflow';

interface Props {
  StoryColumnId: string;
  StoryColumnName: string;
  board: BoardType;
}
// Keep frontend state consistent with backend workflow rules before deriving task statuses.
const normalizeBoard = ({
  board,
  StoryColumnId,
  StoryColumnName,
}: Props): BoardType => ({
  ...board,
  storyColumnId: board.storyColumnId ?? StoryColumnId,
  tasks: board.tasks.map((task) => {
    const normalizedTask =
      task.type === 'STORY'
        ? {
            ...task,
            columnId: getStoryColumnId({
              ...board,
              storyColumnId: board.storyColumnId ?? StoryColumnId,
            }),
            columnName: StoryColumnName,
          }
        : task;

    return {
      // Recompute status after normalizing story placement so derived story progress stays accurate.
      ...normalizedTask,
      status: getTaskStatus(
        {
          ...board,
          storyColumnId: board.storyColumnId ?? StoryColumnId,
          tasks: board.tasks.map((candidate) =>
            candidate.type === 'STORY'
              ? {
                  ...candidate,
                  columnId: board.storyColumnId ?? StoryColumnId,
                  columnName: StoryColumnName,
                }
              : candidate,
          ),
        },
        normalizedTask,
      ),
    };
  }),
});

export default normalizeBoard;
