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
                    assignee: { select: { name: true } },
                    reporter: { select: { name: true } },
                    parent: { select: { title: true } },
                    comments: {
                        include: {
                            author: { select: { id: true, name: true, email: true } },
                        },
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
            const { column, assignee, reporter, parent, comments, ...rest } = task;
            return { 
                ...rest, 
                columnName: column.name,
                assigneeName: assignee?.name || null,
                reporterName: reporter?.name || 'Unknown',
                parentName: parent?.title || null,
                status: rest.type === 'STORY' ? 'In Progress' : column.name,
                comments: comments.map((comment) => {
                    const { author, ...commentRest } = comment;
                    return {
                        ...commentRest,
                        authorName: author.name,
                    };
                }),
            };
        }),
    };
};

export const createBoard = async (projectId: string, name: string): Promise<Board> => {
    const DEFAULT_COLUMNS = [
        { name: 'Stories', order: 0, wipLimit: null },
        { name: 'To Do', order: 1, wipLimit: null },
        { name: 'In Progress', order: 2, wipLimit: 3 },
        { name: 'Review', order: 3, wipLimit: 3 },
        { name: 'Done', order: 4, wipLimit: null },
    ];

    const board = await p.board.create({
        data: {
            name,
            projectId,
            columns: {
                create: DEFAULT_COLUMNS,
            },
        },
    });

    return board;
}