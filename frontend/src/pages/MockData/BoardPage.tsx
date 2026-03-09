import type { NewTaskInput } from '../../types/Types';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';
import BoardView from '../../components/Board/Board/Board';
import {
  resolveProjectBoardSelection,
  addColumnToBoard,
  renameColumnInBoard,
  reorderColumnInBoard,
  updateColumnWipInBoard,
  deleteColumnFromBoard,
} from './boardOperations';
import { MockUser1 } from './mockData';
import { defaultProjectId, defaultBoardId } from './routingHelpers';

/* ===================================== */
/* Page Component */
/* ===================================== */

export default function BoardPage() {
  const { projectId, boardId } = useParams();

  const resolvedProjectId = projectId ?? defaultProjectId;
  const resolvedBoardId = boardId ?? defaultBoardId;

  const selection = useMemo(() => {
    return (
      resolveProjectBoardSelection(resolvedProjectId, resolvedBoardId) ??
      resolveProjectBoardSelection(defaultProjectId, defaultBoardId)
    );
  }, [resolvedProjectId, resolvedBoardId]);

  if (!selection) {
    return (
      <Layout>
        <div style={{ padding: '20px' }}>No project/board data found.</div>
      </Layout>
    );
  }

  const [board, setBoard] = useState(selection.board);

  useEffect(() => {
    setBoard(selection.board);
  }, [selection.board]);

  const deleteTask = useCallback(
    async (taskId: string): Promise<void> => {
      try {
        // Permission check
        const projectDetails = selection.project;
        if (projectDetails.userRole === 'PROJECT_VIEWER') {
          alert('You do not have permission to delete tasks.');
          return;
        }

        // Parent-child protection
        const hasChildren = board.tasks.some((t) => t.parentId === taskId);
        if (hasChildren) {
          alert('Cannot delete a Story with child tasks.');
          return;
        }

        // Simulate backend delay
        await new Promise((res) => setTimeout(res, 300));

        setBoard((prev) => ({
          ...prev,
          tasks: prev.tasks.filter((t) => t.id !== taskId),
        }));
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    },
    [board.tasks, selection.project],
  );

  const createTask = useCallback(
    async (payload: NewTaskInput): Promise<void> => {
      const projectDetails = selection.project;
      if (projectDetails.userRole === 'PROJECT_VIEWER') {
        alert('You do not have permission to create tasks.');
        return;
      }

      const now = new Date().toISOString();
      const column = board.columns.find((c) => c.id === payload.columnId);

      await new Promise((res) => setTimeout(res, 200));

      setBoard((prev) => ({
        ...prev,
        tasks: [
          {
            id: `${prev.id}-t${Date.now()}`,
            title: payload.title,
            description: payload.description ?? null,
            type: payload.type,
            priority: payload.priority,
            dueDate: payload.dueDate,
            createdAt: now,
            updatedAt: now,
            columnId: payload.columnId,
            columnName: column?.name ?? 'Unknown',
            reporterId: MockUser1.id,
            assigneeId: payload.assigneeId ?? null,
            parentId: payload.parentId ?? null,
            comments: [],
          },
          ...prev.tasks,
        ],
      }));
    },
    [board.columns, selection.project],
  );

  const updateTask = useCallback(
    async (taskId: string, payload: NewTaskInput): Promise<void> => {
      const projectDetails = selection.project;
      if (projectDetails.userRole === 'PROJECT_VIEWER') {
        alert('You do not have permission to edit tasks.');
        return;
      }

      const column = board.columns.find((c) => c.id === payload.columnId);
      await new Promise((res) => setTimeout(res, 200));

      setBoard((prev) => ({
        ...prev,
        tasks: prev.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                title: payload.title,
                description: payload.description ?? null,
                type: payload.type,
                priority: payload.priority,
                dueDate: payload.dueDate,
                columnId: payload.columnId,
                columnName: column?.name ?? task.columnName,
                assigneeId: payload.assigneeId ?? null,
                parentId: payload.parentId ?? null,
                updatedAt: new Date().toISOString(),
              }
            : task,
        ),
      }));
    },
    [board.columns, selection.project],
  );

  const addColumn = useCallback(
    async (columnName: string): Promise<void> => {
      if (selection.project.userRole !== 'PROJECT_ADMIN') {
        alert('Only ProjectAdmin can create columns.');
        return;
      }

      const createdColumn = addColumnToBoard(
        selection.project.id,
        board.id,
        columnName,
      );
      if (!createdColumn) {
        alert('Failed to create column. Please enter a valid name.');
        return;
      }

      setBoard((prev) => ({
        ...prev,
        columns: [...prev.columns, createdColumn].sort(
          (a, b) => a.order - b.order,
        ),
      }));
    },
    [board.id, selection.project],
  );

  const renameColumn = useCallback(
    async (columnId: string, newName: string): Promise<void> => {
      if (selection.project.userRole !== 'PROJECT_ADMIN') {
        alert('Only ProjectAdmin can rename columns.');
        return;
      }

      const updatedColumn = renameColumnInBoard(
        selection.project.id,
        board.id,
        columnId,
        newName,
      );
      if (!updatedColumn) {
        alert('Failed to rename column. Please enter a valid name.');
        return;
      }

      setBoard((prev) => ({
        ...prev,
        columns: prev.columns.map((column) =>
          column.id === columnId
            ? { ...column, name: updatedColumn.name }
            : column,
        ),
        tasks: prev.tasks.map((task) =>
          task.columnId === columnId
            ? { ...task, columnName: updatedColumn.name }
            : task,
        ),
      }));
    },
    [board.id, selection.project],
  );

  const reorderColumn = useCallback(
    async (columnId: string, direction: 'left' | 'right'): Promise<void> => {
      if (selection.project.userRole !== 'PROJECT_ADMIN') {
        alert('Only ProjectAdmin can reorder columns.');
        return;
      }

      const reorderedColumns = reorderColumnInBoard(
        selection.project.id,
        board.id,
        columnId,
        direction,
      );

      if (!reorderedColumns) {
        alert('Failed to reorder column.');
        return;
      }

      setBoard((prev) => ({
        ...prev,
        columns: reorderedColumns,
      }));
    },
    [board.id, selection.project],
  );

  const updateColumnWip = useCallback(
    async (columnId: string, wipLimit: number | null): Promise<void> => {
      if (selection.project.userRole !== 'PROJECT_ADMIN') {
        alert('Only ProjectAdmin can edit WIP limits.');
        return;
      }

      const updatedColumn = updateColumnWipInBoard(
        selection.project.id,
        board.id,
        columnId,
        wipLimit,
      );

      if (!updatedColumn) {
        alert('Failed to update WIP. Use empty for no limit or a number >= 1.');
        return;
      }

      setBoard((prev) => ({
        ...prev,
        columns: prev.columns.map((column) =>
          column.id === columnId
            ? { ...column, wipLimit: updatedColumn.wipLimit }
            : column,
        ),
      }));
    },
    [board.id, selection.project],
  );

  const deleteColumn = useCallback(
    async (columnId: string): Promise<void> => {
      if (selection.project.userRole !== 'PROJECT_ADMIN') {
        alert('Only ProjectAdmin can delete columns.');
        return;
      }

      const updatedColumns = deleteColumnFromBoard(
        selection.project.id,
        board.id,
        columnId,
      );

      if (!updatedColumns) {
        alert(
          'Delete failed. Story, To Do, Done cannot be deleted and column must be empty.',
        );
        return;
      }

      setBoard((prev) => ({
        ...prev,
        columns: updatedColumns,
      }));
    },
    [board.id, selection.project],
  );

  return (
    <Layout>
      <BoardView
        key={`${selection.project.id}:${board.id}`}
        board={board}
        projectDetails={selection.project}
        onDeleteTask={deleteTask}
        onCreateTask={createTask}
        onUpdateTask={updateTask}
        onAddColumn={addColumn}
        onRenameColumn={renameColumn}
        onReorderColumn={reorderColumn}
        onUpdateColumnWip={updateColumnWip}
        onDeleteColumn={deleteColumn}
      />
    </Layout>
  );
}
