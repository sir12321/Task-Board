import type { Board as BoardType } from '../../../types/Types';

interface Props {
  StoryColumnId: string;
  StoryColumnName: string;
  board: BoardType;
}
// Ensure story tasks always live in the Stories column.
const normalizeBoard = ({ board, StoryColumnId, StoryColumnName }: Props): BoardType => ({
  ...board, // makes a copy of object with tasks overwritten
  tasks: board.tasks.map((t) =>
    t.type === 'STORY'
      ? { ...t, columnId: StoryColumnId, columnName: StoryColumnName }
      : t,
  ),
});

export default normalizeBoard;
