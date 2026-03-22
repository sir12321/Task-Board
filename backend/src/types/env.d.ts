declare namespace NodeJS {
  interface ProcessEnv {
    PORT: string;
    NODE_ENV: 'development' | 'production' | 'test';
    DATABASE_URL: string;

    FRONTEND_ORIGIN: string;
    JWT_ACCESS_SECRET: string;
    JWT_REFRESH_SECRET: string;
  }
}
