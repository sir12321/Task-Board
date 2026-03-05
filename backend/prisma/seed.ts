import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() : Promise<void> {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@taskboard.com' },
        update: {},
        create: {
            email: 'admin@taskboard.com',
            name: 'Admin',
            password: hashedPassword,
            globalRole: 'GLOBAL_ADMIN',
        }
    });

    console.log('Seeded global admin:', admin.email);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });