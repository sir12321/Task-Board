# Task-Board (COP290 Assignment 2)

This application is composed of a decoupled architecture with a **React + Vite** frontend and a **Node.js + Express + Prisma (SQLite)** backend.

## 🚀 Installation & Setup Instructions for Grading

Please follow the steps below to run both the frontend and backend of the application locally.

### Prerequisites
- Node.js (v18 or higher recommended)
- npm

---

### 1. Backend Setup

Open a terminal and follow these steps to setup and start the backend server:

```bash
# Navigate to the backend directory
cd backend

# Install all backend dependencies
npm install

# Create your local environment variables file
cp .env.example .env

# Generate the Prisma client and apply database migrations to setup the local SQLite DB
npx prisma migrate dev

# Seed the database with initial data (users, projects, etc.)
npx prisma db seed

# Start the backend development server
npm run dev
```

The backend server will normally start on **http://localhost:8000**.

---

### 2. Frontend Setup

Open a **new** terminal window and follow these steps to setup and start the frontend React client:

```bash
# Navigate to the frontend directory
cd frontend

# Install all frontend dependencies
npm install

# Create your local environment variables file
cp .env.example .env

# Start the frontend development server
npm run dev
```

The frontend client will normally be available at **http://localhost:5173**. Open this URL in your browser to interact with the application.

---

### Additional Notes for Graders

- **`.env` files**: Both `.env.example` files have been provided to ensure the necessary environment variables (`JWT_ACCESS_SECRET`, `VITE_API_BASE_URL`, etc.) are readily available. Please make sure you run the `cp .env.example .env` step in both directories.
- **Database**: The backend uses an integrated SQLite database (`dev.db`). The `npx prisma migrate dev` command automatically sets up the table schema, and `npx prisma db seed` populates it with dummy test data so the app can be evaluated immediately without needing to manually register new accounts first.
