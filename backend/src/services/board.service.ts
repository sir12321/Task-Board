import p from '../utils/prisma';
import { Board, Column, Task, Comment } from '@prisma/client';

type TaskWithColumnName = Task & { comments: Comment[]; columnName: string };

type BoardResponse = Board & {
    columns: Column[];
    tasks: TaskWithColumnName[];
};

export const getBoards = async (boardId: string): Promise<BoardResponse | null> => {
    const board = await p.board.findUnique({
        where: { id: boardId },
        include: {
            columns: {
                orderBy: { order: 'asc' },
            },
            tasks: {
                include: {
                    column: { select: { name: true } },
                    comments: {
                        orderBy: { createdAt: 'asc' },
                    },
                },
            },
        },
    });

    if (!board) return null;

    return {
        ...board,
        tasks: board.tasks.map((task) => {
            const { column, ...rest } = task;
            return { ...rest, columnName: column.name };
        }),
    };
};