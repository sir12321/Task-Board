# Task-Board (COP290 Assignment 2)

A Jira-inspired task board with:

- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- Database: Prisma + SQLite

## Collaborators

- Prabuddha Sinha - 2024CS10199
- Manya Jain - 2024CS10351

## Quick Setup

Prerequisites:

- Node.js (v18+ recommended)
- npm

### 1) Backend

cd backend
npm install
cp .env.example .env
npx prisma migrate dev
npx prisma db seed
npm run dev

Backend runs on: http://localhost:8000

### 2) Frontend

Open a new terminal:

cd frontend
npm install
cp .env.example .env
npm run dev

Frontend runs on: http://localhost:5173

## Environment Variables

backend/.env (from .env.example):

- PORT=8000
- FRONTEND_ORIGIN=http://localhost:5173
- JWT_ACCESS_SECRET=change-me-access-secret
- JWT_REFRESH_SECRET=change-me-refresh-secret

frontend/.env (from .env.example):

- VITE_API_BASE_URL=/api

## Testing

Backend:

- npm test
- npm run test:unit
- npm run test:e2e

## Seeded Login

- Password for seeded users: 616
- Example global admins:
  - nick.fury@avengershq.org
  - victor.doom@latveria.gov

## API (Short)

Base URL: http://localhost:8000
Base path: /api
Auth: JWT via HTTP-only cookies

Main route groups:

- /api/auth
- /api/users
- /api/projects
- /api/projects/:projectId/members
- /api/boards
- /api/columns
- /api/tasks
- /api/comments
- /api/notifications

Health check:

- GET /health

For detailed API contracts, workflow rules, and design decisions, refer to report.pdf.
