import p from '../utils/prisma';

export const getBoards = async (boardId: string) => {
    const board = await p.board.findUnique({
        where: {id: boardId},
        include: {
            columns: {
                orderBy: { order : 'asc' },
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