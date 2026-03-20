import { defineConfig } from 'prisma/config';
import 'dotenv/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',

  datasource: {
    url: process.env.DATABASE_URL,
  },

  migrations: {
    // this command will be run when `prisma db seed` is executed
    seed: 'ts-node --transpile-only prisma/seed.ts',
  },
});
