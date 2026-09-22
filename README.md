# Project Management App

A full-stack project and task management application with real-time team chat, video meetings, and role-based access control. Built with React, Express, PostgreSQL, Redis, and Stream.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Running the Project](#running-the-project)
- [API Documentation](#api-documentation)
- [Authentication & Authorization](#authentication--authorization)
- [Background Job Processing](#background-job-processing)
- [Docker](#docker)
- [Seed Data](#seed-data)
- [Postman Collection](#postman-collection)
- [Important Implementation Details](#important-implementation-details)

---

## Features

- **User Authentication** — Register, login, and logout with JWT-based auth stored in HTTP-only cookies.
- **Project Management** — Create, update, delete, and list projects with search, sort, and pagination.
- **Task Management** — Create, update, delete, and list tasks with filtering by status, priority, and search.
- **Team Collaboration** — Add/remove project members by email. Only the project creator (or admin) can manage members.
- **Real-Time Chat** — Per-project messaging channels powered by Stream Chat. Task events (create, update, delete) are announced in the project chat automatically.
- **Video Meetings** — Per-project video calls using Stream Video with speaker layout and call controls.
- **User Profiles** — Update name, email, avatar (via ImageKit upload), and password. Delete account with password confirmation.
- **Role-Based Access Control** — Two roles: `ADMIN` (full access to all projects) and `MEMBER` (access only to projects they belong to).
- **Rate Limiting** — Redis-backed rate limits at global, auth, and sensitive-action levels.
- **Health Check Endpoint** — Reports service, database, and Redis status.

---

## Tech Stack

### Backend

| Technology                                                     | Purpose                                     |
| -------------------------------------------------------------- | ------------------------------------------- |
| **Express 5**                                                  | HTTP server and REST API                    |
| **TypeScript**                                                 | Type safety                                 |
| **Prisma 7** (with `@prisma/adapter-pg`)                       | ORM and database migrations                 |
| **PostgreSQL**                                                 | Relational database                         |
| **Redis** (via ioredis)                                        | Rate limiting, token revocation, job queues |
| **BullMQ**                                                     | Background job processing                   |
| **Stream Chat & Video** (`stream-chat`, `@stream-io/node-sdk`) | Real-time messaging and video calls         |
| **ImageKit**                                                   | Image upload and management (avatars)       |
| **Zod**                                                        | Request validation                          |
| **bcryptjs**                                                   | Password hashing                            |
| **jsonwebtoken**                                               | JWT token generation and verification       |
| **Helmet**                                                     | HTTP security headers                       |
| **Jest** + **SWC**                                             | Testing framework (configured)              |

### Frontend

| Technology                 | Purpose                                      |
| -------------------------- | -------------------------------------------- |
| **React 19**               | UI framework                                 |
| **Vite 8**                 | Build tool and dev server                    |
| **React Router 7**         | Client-side routing with loaders and actions |
| **TanStack React Query**   | Server state management and caching          |
| **Tailwind CSS 4**         | Utility-first styling                        |
| **Axios**                  | HTTP client                                  |
| **Stream Chat React**      | Chat UI components                           |
| **Stream Video React SDK** | Video call UI components                     |
| **ImageKit JS SDK**        | Client-side image uploads                    |
| **React Toastify**         | Toast notifications                          |

---

## Architecture

![System Architecture — Database as Source of Truth with Sync Outward + Retry Queue](docs/architecture.png)

### Database as Source of Truth + Sync Outward + Retry Queue

The central design principle is: **PostgreSQL is always the source of truth.** The API writes to the database first and returns immediately — the request never waits on a third-party service. External systems (Stream Chat, Stream Video, ImageKit) are then **synced outward** asynchronously via a **BullMQ job queue** backed by Redis.

If an external service is down, the database still has the data, and BullMQ retries the sync in the background with exponential backoff (up to 5 attempts). This means:

- A project is **always created** in the database, even if Stream is unreachable.
- A member is **always added** to the project, even if the chat channel update fails.
- The user **always gets a fast response** — no blocking on slow third-party APIs.

### Modular Backend

The backend follows a **modular architecture** with each domain (auth, users, projects, tasks, stream, imagekit, health) organized into its own module containing `routes → controllers → services`, with shared middlewares for auth, validation, rate limiting, and project access control.

---

## Project Structure

```
task-management-app/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema (User, Project, ProjectMember, Task)
│   │   ├── migrations/            # Prisma migration history
│   │   └── seed.ts                # Seed script with sample data
│   ├── src/
│   │   ├── index.ts               # Express app entry point, route registration, graceful shutdown
│   │   ├── modules/
│   │   │   ├── auth/              # Register, login, logout
│   │   │   ├── users/             # Profile, avatar, password, account deletion
│   │   │   ├── projects/          # CRUD, member management
│   │   │   ├── tasks/             # CRUD with filtering and pagination
│   │   │   ├── stream/            # Stream token generation (chat + video)
│   │   │   ├── imagekit/          # ImageKit upload auth parameters
│   │   │   └── health/            # Health check (service, DB, Redis)
│   │   ├── middlewares/
│   │   │   ├── auth.ts            # JWT verification + Redis token revocation check
│   │   │   ├── checkProjectAccess.ts  # Project membership/creator authorization
│   │   │   ├── rateLimiters.ts    # Global + sensitive Redis-backed rate limiters
│   │   │   ├── validate.ts        # Zod schema validation (body/query/params)
│   │   │   └── errorHandler.ts    # Centralized error handler
│   │   ├── lib/                   # Singletons: Prisma, Redis, BullMQ, Stream, ImageKit, env
│   │   ├── workers/
│   │   │   └── sync.worker.ts     # BullMQ worker for Stream + ImageKit background jobs
│   │   ├── utils/                 # JWT, hashing, cookie helpers
│   │   ├── errors/                # Custom error classes (NotFound, Unauthorized, etc.)
│   │   └── types/                 # Express type augmentation
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Router configuration with loaders/actions
│   │   ├── pages/                 # Route pages (Register, Login, Dashboard, Projects, etc.)
│   │   ├── components/            # Reusable components (forms, pagination, containers)
│   │   ├── context/               # React contexts (Dashboard, Stream chat/video provider)
│   │   └── utils/                 # Axios instance, constants
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── postman/                       # Postman collection for API testing
├── Dockerfile                     # Multi-stage production build
├── docker-compose.yml             # Redis service for local development
└── .dockerignore
```

---

## Getting Started

### Prerequisites

- **Node.js** 22+
- **Redis** — either locally installed or via Docker
- **PostgreSQL** — a running PostgreSQL instance (e.g., [Neon](https://neon.tech), local, or Docker)
- **Stream** account — for chat and video ([getstream.io](https://getstream.io))
- **ImageKit** account — for image uploads ([imagekit.io](https://imagekit.io))

### Installation

```bash
# Clone the repository
git clone https://github.com/Zsayaaad/task-management-app.git
cd task-management-app

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Environment Variables

Create a `.env` file in the `backend/` directory based on `.env.example`:

```env
PORT=3001
NODE_ENV=development

DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require

JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

STREAM_API_KEY=your-stream-api-key
STREAM_API_SECRET=your-stream-api-secret

IMAGEKIT_PUBLIC_KEY=your-imagekit-public-key
IMAGEKIT_PRIVATE_KEY=your-imagekit-private-key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your-imagekit-id

REDIS_URL=redis://localhost:6379
```

| Variable                | Description                                              |
| ----------------------- | -------------------------------------------------------- |
| `PORT`                  | Backend server port (default: `3001`)                    |
| `NODE_ENV`              | `development`, `production`, or `test`                   |
| `DATABASE_URL`          | PostgreSQL connection string                             |
| `JWT_SECRET`            | Secret key for signing JWTs                              |
| `JWT_EXPIRES_IN`        | Token expiry duration (default: `7d`)                    |
| `STREAM_API_KEY`        | Stream API key (from your Stream dashboard)              |
| `STREAM_API_SECRET`     | Stream API secret                                        |
| `IMAGEKIT_PUBLIC_KEY`   | ImageKit public key                                      |
| `IMAGEKIT_PRIVATE_KEY`  | ImageKit private key                                     |
| `IMAGEKIT_URL_ENDPOINT` | ImageKit URL endpoint                                    |
| `REDIS_URL`             | Redis connection URL (default: `redis://localhost:6379`) |

All environment variables are validated at startup using Zod. Missing or invalid values will cause the server to fail fast with a descriptive error.

### Database Setup

```bash
cd backend

# Generate the Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# (Optional) Seed the database with sample data
npm run seed
```

### Running the Project

**1. Start Redis** (using Docker Compose from the project root):

```bash
docker compose up -d
```

**2. Start the backend** (from `backend/`):

```bash
npm run dev
```

The API server starts at `http://localhost:3001`.

**3. Start the frontend** (from `frontend/`):

```bash
npm run dev
```

The frontend starts at `http://localhost:5173` and proxies `/api` requests to the backend.

---

## API Documentation

All API routes are prefixed with `/api/v1`. Protected routes require a valid JWT token in the `token` cookie.

### Auth

| Method | Endpoint         | Auth | Description                     |
| ------ | ---------------- | ---- | ------------------------------- |
| `POST` | `/auth/register` | No   | Register a new user             |
| `POST` | `/auth/login`    | No   | Log in and receive a JWT cookie |
| `POST` | `/auth/logout`   | No   | Clear the auth cookie           |

### Users

| Method   | Endpoint                 | Auth | Description                                     |
| -------- | ------------------------ | ---- | ----------------------------------------------- |
| `GET`    | `/users/current-user`    | Yes  | Get current authenticated user                  |
| `PATCH`  | `/users/profile`         | Yes  | Update name and/or email                        |
| `PATCH`  | `/users/avatar`          | Yes  | Update avatar URL                               |
| `PATCH`  | `/users/change-password` | Yes  | Change password (requires current password)     |
| `DELETE` | `/users/account`         | Yes  | Delete account (requires password confirmation) |

### Projects

| Method   | Endpoint                               | Auth | Description                                |
| -------- | -------------------------------------- | ---- | ------------------------------------------ |
| `POST`   | `/projects`                            | Yes  | Create a new project                       |
| `GET`    | `/projects`                            | Yes  | List projects (search, sort, pagination)   |
| `GET`    | `/projects/:projectId`                 | Yes  | Get project details                        |
| `PATCH`  | `/projects/:projectId`                 | Yes  | Update project (creator/admin only)        |
| `DELETE` | `/projects/:projectId`                 | Yes  | Delete project (creator/admin only)        |
| `GET`    | `/projects/:projectId/members`         | Yes  | List project members                       |
| `POST`   | `/projects/:projectId/members`         | Yes  | Add a member by email (creator/admin only) |
| `DELETE` | `/projects/:projectId/members/:userId` | Yes  | Remove a member (creator/admin only)       |

### Tasks

| Method   | Endpoint                    | Auth | Description                                     |
| -------- | --------------------------- | ---- | ----------------------------------------------- |
| `POST`   | `/tasks/:projectId`         | Yes  | Create a task                                   |
| `GET`    | `/tasks/:projectId`         | Yes  | List tasks (filter by status, priority, search) |
| `GET`    | `/tasks/:projectId/:taskId` | Yes  | Get task details                                |
| `PATCH`  | `/tasks/:projectId/:taskId` | Yes  | Update a task                                   |
| `DELETE` | `/tasks/:projectId/:taskId` | Yes  | Delete a task (creator/admin only)              |

### Stream

| Method | Endpoint        | Auth | Description                           |
| ------ | --------------- | ---- | ------------------------------------- |
| `GET`  | `/stream/token` | Yes  | Generate Stream chat and video tokens |

### ImageKit

| Method | Endpoint         | Auth | Description                                   |
| ------ | ---------------- | ---- | --------------------------------------------- |
| `GET`  | `/imagekit/auth` | Yes  | Get ImageKit upload authentication parameters |

### Health

| Method | Endpoint  | Auth | Description                                  |
| ------ | --------- | ---- | -------------------------------------------- |
| `GET`  | `/health` | No   | Health check (service, DB, and Redis status) |

---

## Authentication & Authorization

- **JWT tokens** are stored in HTTP-only, secure, strict-SameSite cookies (7-day expiry).
- On logout, tokens are added to a **Redis revocation list** so they cannot be reused.
- The auth middleware verifies the JWT and checks for revocation against Redis. If Redis is unavailable, the request is allowed through (fail-open).
- **Two roles** exist:
  - `ADMIN` — can access all projects and perform all operations.
  - `MEMBER` — can only access projects they are a member of.
- **Project-level authorization** — modifying or deleting a project requires being its creator or an admin. Accessing a project requires being a member or an admin.
- **Task-level authorization** — updating a task requires being the task creator, the task assignee, or an admin. Deleting a task requires being the task creator or an admin.

---

## Background Job Processing

External API calls to **Stream** and **ImageKit** are processed asynchronously via a **BullMQ** sync queue backed by Redis. This ensures:

- API responses are not blocked by slow third-party calls.
- Failed jobs are retried with exponential backoff (up to 5 attempts: 2s → 4s → 8s → 16s → 32s).
- The worker processes up to 5 jobs concurrently.

**Job types handled by the sync worker:**

| Job Name                | Description                                             |
| ----------------------- | ------------------------------------------------------- |
| `stream.channel.create` | Create a Stream chat channel for a new project          |
| `stream.channel.update` | Rename a channel when a project is renamed              |
| `stream.channel.delete` | Delete a channel when a project is deleted              |
| `stream.member.add`     | Add a user to a project's chat channel                  |
| `stream.member.remove`  | Remove a user from a project's chat channel             |
| `stream.announce`       | Post a silent message to a project's chat (task events) |
| `imagekit.delete`       | Delete an old avatar image from ImageKit                |

---

## Docker

### Development (Redis only)

```bash
docker compose up -d
```

This starts a Redis 7 instance on port `6379` with persistent storage.

### Production Build

The `Dockerfile` uses a multi-stage build to create a single container that serves both the API and the frontend:

```bash
docker build -t projectflow .
docker run -p 3001:3001 --env-file backend/.env projectflow
```

**Build stages:**

1. **frontend-build** — Installs frontend dependencies and runs `vite build`.
2. **backend-build** — Installs backend dependencies, generates Prisma client, and compiles TypeScript.
3. **runner** — Installs only production dependencies, copies build artifacts, and serves everything from `node dist/index.js`. Express serves the SPA static files from `public/` and API routes from `/api/v1`.

---

## Seed Data

The seed script (`npm run seed` in `backend/`) resets the database and creates sample data:

| Account      | Email                 | Password     | Role     |
| ------------ | --------------------- | ------------ | -------- |
| Admin User   | `admin@example.com`   | `Admin123!`  | `ADMIN`  |
| Alex Johnson | `member@example.com`  | `Member123!` | `MEMBER` |
| Sarah Smith  | `member2@example.com` | `Member123!` | `MEMBER` |
| David Chen   | `member3@example.com` | `Member123!` | `MEMBER` |

The seed also creates sample projects with tasks assigned across members.

---

## Postman Collection

A Postman collection is included at `postman/projectflow.postman_collection.json`. Import it into Postman to test all API endpoints.

---

## Important Implementation Details

- **Graceful Shutdown** — The server handles `SIGTERM` and `SIGINT` signals by stopping new connections, draining in-flight requests, closing the BullMQ worker/queue, Redis, and Prisma connections, and force-exiting after 10 seconds if draining stalls.
- **Prisma Adapter Pattern** — Uses `@prisma/adapter-pg` for direct PostgreSQL driver integration rather than the default Prisma query engine.
- **Zod Environment Validation** — All environment variables are validated and typed with Zod at startup. Invalid configuration fails fast.
- **Request Validation** — All request bodies and query parameters are validated using Zod schemas via a reusable `validate` middleware.
- **Rate Limiting** — Three tiers of Redis-backed rate limiting:
  - **Global**: 300 requests / 15 min / IP across the entire API.
  - **Auth**: 5 requests / 15 min / IP for login and registration.
  - **Sensitive**: 10 requests / 15 min / IP for project creation, task creation, and image upload auth.
- **Stream Chat Sync** — Each project maps 1:1 to a Stream messaging channel (`project-<projectId>`). Task lifecycle events are posted as silent messages.
- **React Query Caching** — Default stale time of 5 minutes. Query invalidation is handled through React Router actions.
- **Vite Dev Proxy** — The frontend proxies `/api` requests to `http://localhost:3001` during development, matching the production architecture where Express serves both API and static files.
