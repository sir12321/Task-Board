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

export const getUserProjects = async (userId: string): Promise<ProjectSummary[]> => {
    const projects = await prisma.project.findMany({
        where: {
            isArchived: false,
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

export const archiveProject = async (userId: string, projectId: string, globalRole: string): Promise<Project> => {
    if (globalRole !== 'GLOBAL_ADMIN') {
        const member = await prisma.projectMember.findUnique({
            where: { userId_projectId: { userId, projectId } },
            select: { role: true },
        });

        if (!member || member.role !== 'PROJECT_ADMIN') {
            throw new Error('Forbidden: Only Global Admins or Project Admins can archive projects.');
        }
    }

    return prisma.project.update({
        where: { id: projectId },
        data: { isArchived: true },
    });
};