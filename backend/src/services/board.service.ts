import p from '../utils/prisma';
import { Board, Column, Task, Comment } from '@prisma/client';

type BoardWithDetails = Board & {
    columns: Column[];
    tasks: (Task & { comments: Comment[] })[];
};

export const getBoards = async (boardId: string): Promise<BoardWithDetails | null> => {
    const board = await p.board.findUnique({
        where: { id: boardId },
        include: {
            columns: {
                orderBy: { order: 'asc' },
            },
            tasks: {
                include: {
                    comments: {
                        orderBy: { createdAt: 'asc' },
                    },
                },
            },
        },
    });

    return board;
};