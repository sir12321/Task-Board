import prisma from "../utils/prisma";

export const getUserProjects = async (userId: string) => {
    const projects = await prisma.project.findMany({
        where: {
            members: {
                some: { userId },
            },
        },
        include: {
            members: {
                include: {
                    user: {
                        select: { id: true, name: true, avatarUrl: true },
                    },
                },
            },
            boards: {
                select: { id: true, name: true },
            },
        },
    });

    return projects.map((project) => {
        const currentUserMember = project.members.find((m) => m.userId === userId);

        return {
            id: project.id,
            name: project.name,
            description: project.description,
            userRole: currentUserMember?.role || 'PROJECT_VIEWER',
            members: project.members.map((m) => ({
                id: m.user.id,
                name: m.user.name,
                role: m.role,
                avatarUrl: m.user.avatarUrl,
            })),
            boards: project.boards,
        };
    });
};

export const createProject = async (userId: string, data: { name: string; description?: string }) => {
    const newProject = await prisma.project.create({
        data: {
            name: data.name,
            description: data.description,
            members: {
                create: {
                    userId,
                    role: 'PROJECT_ADMIN',
                },
            },
            boards: {
                create: {
                    name: 'Main Board',
                },
            },
        },
    });
    
    return newProject;
};