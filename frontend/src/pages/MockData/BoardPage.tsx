import { useState } from 'react';
import Layout from '../../components/Layout/Layout';
import type { Board as BoardType } from '../../types/Board';
import Board from '../../components/Board/Board';

const initialBoard: BoardType = {
  id: 'board-1',
  name: 'Demo Board',
  columns: [
    { id: 'col-backlog', title: 'To Do', order: 1, wipLimit: null },
    { id: 'col-progress', title: 'In Progress', order: 2, wipLimit: 3 },
    { id: 'col-review', title: 'Review', order: 3, wipLimit: 3 },
    { id: 'col-done', title: 'Done', order: 4, wipLimit: null },
  ],
  tasks: [
    {
      id: 't1',
      title: 'Set up project',
      description: 'Initialize repository and tooling',
      type: 'TASK',
      status: 'col-backlog',
      priority: 'HIGH',
      assigneeId: 'Abb',
      reporterId: 'u1',
      parentId: null,
      dueDate: new Date('2026-03-02').toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 't2',
      title: 'Implement login',
      description: 'Create login UI and navigation',
      type: 'STORY',
      status: 'col-progress',
      priority: 'MEDIUM',
      assigneeId: 'fcea',
      reporterId: 'u1',
      parentId: null,
      dueDate: new Date('2026-03-02').toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 't3',
      title: 'Set up environment',
      description: 'Initialize repository and tooling',
      type: 'TASK',
      status: 'col-backlog',
      priority: 'HIGH',
      assigneeId: 'hgh',
      reporterId: 'u1',
      parentId: 't1',
      dueDate: new Date('2026-03-02').toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 't4',
      title: 'Implement login',
      description: 'Create login UI and navigation',
      type: 'BUG',
      status: 'col-progress',
      priority: 'MEDIUM',
      assigneeId: '',
      reporterId: 'u1',
      parentId: 't2',
      dueDate: new Date('2026-03-05').toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
};

function BoardPage() {
  // Keep board in state so the UI can update it later.
  const [board] = useState<BoardType>(initialBoard);

  return (
    <Layout>
      <div style={{ padding: '20px' }}>
        <h1>TaskFlow Platform</h1>
        {/* Pass the board object to the Board component */}
        <Board board={board} />
      </div>
    </Layout>
  );
}

export default BoardPage;
