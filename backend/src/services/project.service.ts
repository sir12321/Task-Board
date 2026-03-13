import prisma from "../utils/prisma";
import { Project } from "@prisma/client";

interface ProjectSummary {
    id: string;
    name: string;
    description: string | null;
    userRole: string;
    members: {
        id: string;
        name: string;
        email: string;
        role: string;
        avatarUrl: string | null;
    }[];
    boards: { id: string; name: string }[];
}

// instead of searching, use hashmap for O(1) access
export const getUserProjects = async (userId: string, globalRole?: string): Promise<ProjectSummary[]> => {
    const projects = await prisma.project.findMany({
        where: globalRole === 'GLOBAL_ADMIN'
            ? undefined
            : {
                members: {
                    some: { userId },
                },
            },
        include: {
            members: {
                include: {
                    user: {
                        select: { id: true, name: true, email: true, avatarUrl: true },
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
            isArchived: project.isArchived,
            members: project.members.map((m) => ({
                id: m.user.id,
                name: m.user.name,
                email: m.user.email,
                role: m.role,
                avatarUrl: m.user.avatarUrl,
            })),
            boards: project.boards,
        };
    });
};

export const createProject = async (userId: string, data: { name: string; description?: string }): Promise<Project> => {
    const DEFAULT_COLUMNS = [
        { name: 'Stories', order: 0, wipLimit: null },
        { name: 'To Do', order: 1, wipLimit: null },
        { name: 'In Progress', order: 2, wipLimit: 3 },
        { name: 'Review', order: 3, wipLimit: 3 },
        { name: 'Done', order: 4, wipLimit: null },
    ];

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
                    columns: {
                        create: DEFAULT_COLUMNS,
                    },
                },
            },
        },
    });

    
    return newProject;
};

export const archiveProject = async (
    userId: string, 
    projectId: string, 
    globalRole: string, 
    updates: {
        isArchived?: boolean;
        name?: string;
        description?: string | null;
    }
): Promise<Project> => {
    if (globalRole !== 'GLOBAL_ADMIN') {
        const member = await prisma.projectMember.findUnique({
            where: { userId_projectId: { userId, projectId } },
            select: { role: true },
        });

        if (!member || member.role !== 'PROJECT_ADMIN') {
            throw new Error('Forbidden: Only Global Admins or Project Admins can archive projects.');
        }
    }

    const data: { isArchived?: boolean; name?: string; description?: string | null } = {};

    if (typeof updates.isArchived === 'boolean') {
        data.isArchived = updates.isArchived;
    }

    if (typeof updates.name === 'string') {
        const trimmedName = updates.name.trim();
        if (!trimmedName) {
            throw new Error('Project name is required');
        }
        data.name = trimmedName;
    }

    if (updates.description !== undefined) {
        data.description = updates.description === null ? null : updates.description;
    }

    return prisma.project.update({
        where: { id: projectId },
        data,
    });
};
